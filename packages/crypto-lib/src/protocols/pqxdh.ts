/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks PQXDH — Post-Quantum Extended Triple Diffie-Hellman key agreement.
 *
 * Signal's PQXDH (revision 3) with curve25519, SHA-256 and ML-KEM-768:
 *
 *   The initiator verifies the responder's pre-key signatures, then
 *   DH1 = X25519(IK_A, SPK_B)
 *   DH2 = X25519(EK_A, IK_B)
 *   DH3 = X25519(EK_A, SPK_B)
 *   DH4 = X25519(EK_A, OPK_B)  [optional]
 *   (CT, SS) = ML-KEM-768.Encaps(PQPK_B)
 *   SK = HKDF-SHA256(salt = 32 zero bytes,
 *                    ikm  = 32 0xFF bytes || DH1 || DH2 || DH3 [|| DH4] || SS,
 *                    info = "<info>_CURVE25519_SHA-256_ML-KEM-768")
 *   AD = EncodeEC(IK_A) || EncodeEC(IK_B)
 *
 * The first message must be encrypted under SK with AD as associated data.
 * ML-KEM binds its public key into SS, so AD needs no EncodeKEM(PQPK_B).
 *
 * One deliberate difference: Signal signs pre-keys with the X25519
 * identity key itself (XEdDSA); here an identity is an X25519 key and an
 * Ed25519 signing key, so each pre-key signature also covers the X25519
 * identity key, binding the pair: Sig(IK_sign, EncodeEC(IK) || Encode(PK)).
 */

import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { ml_kem768 } from "../accel/pq-backend";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { CryptoError, CryptoErrorCode } from "../errors";
import { isHex } from "../encoding";

// --- Types ---

/** Long-term identity key pair (X25519 + Ed25519). */
export interface IdentityKeyPair {
  /** Hex-encoded X25519 private key (32 bytes). */
  privateKey: string;
  /** Hex-encoded X25519 public key (32 bytes). */
  publicKey: string;
  /** Hex-encoded Ed25519 signing private key (32 bytes). */
  signingPrivateKey: string;
  /** Hex-encoded Ed25519 signing public key (32 bytes). */
  signingPublicKey: string;
}

/** Signed X25519 pre-key authenticated by the identity key. */
export interface SignedPreKey {
  /** Hex-encoded X25519 private key (32 bytes). */
  privateKey: string;
  /** Hex-encoded X25519 public key (32 bytes). */
  publicKey: string;
  /** Hex-encoded Ed25519 signature over EncodeEC(IK) || EncodeEC(SPK). */
  signature: string;
}

/** One-time X25519 pre-key (unsigned, single use). */
export interface OneTimePreKey {
  /** Hex-encoded X25519 private key (32 bytes). */
  privateKey: string;
  /** Hex-encoded X25519 public key (32 bytes). */
  publicKey: string;
}

/** ML-KEM-768 post-quantum pre-key signed by the identity key. */
export interface PqPreKey {
  /** Hex-encoded ML-KEM-768 public (encapsulation) key. */
  publicKey: string;
  /** Hex-encoded ML-KEM-768 secret (decapsulation) key. */
  secretKey: string;
  /** Hex-encoded Ed25519 signature over EncodeEC(IK) || EncodeKEM(PQPK). */
  signature: string;
}

/** Parameters for initiating a PQXDH session (sender side). */
export interface InitiateSessionParams {
  /** Initiator's identity key pair. */
  identityKeyPair: IdentityKeyPair;
  /** Responder's X25519 identity public key (hex). */
  remoteIdentityPublic: string;
  /** Responder's Ed25519 identity signing public key (hex). */
  remoteIdentitySigningPublic: string;
  /** Responder's signed pre-key public key (hex). */
  remoteSignedPreKeyPublic: string;
  /** Responder's signature over its signed pre-key (hex). */
  remoteSignedPreKeySignature: string;
  /** Responder's one-time pre-key public key (hex, optional). */
  remoteOneTimePreKeyPublic?: string;
  /** Responder's PQ pre-key public key (hex). */
  remotePqPreKeyPublic: string;
  /** Responder's signature over its PQ pre-key (hex). */
  remotePqPreKeySignature: string;
  /** Application name, at least 8 ASCII characters (default `"crypto-service"`). */
  info?: string;
}

/** Result of initiating a PQXDH session (shared secret + ephemeral data). */
export interface InitiateSessionResult {
  /** Hex-encoded 32-byte shared secret SK. */
  sharedSecret: string;
  /** Hex-encoded AD to authenticate with the first message. */
  associatedData: string;
  /** Hex-encoded ephemeral X25519 public key (to send to responder). */
  ephemeralPublicKey: string;
  /** Hex-encoded ML-KEM-768 ciphertext (to send to responder). */
  pqCiphertext: string;
  /** Algorithm identifier. */
  algorithm: "pqxdh";
}

/** Parameters for responding to a PQXDH session (receiver side). */
export interface RespondToSessionParams {
  /** Responder's identity key pair. */
  identityKeyPair: IdentityKeyPair;
  /** Responder's signed pre-key private key (hex). */
  signedPreKeyPrivate: string;
  /** Responder's one-time pre-key private key (hex, optional). */
  oneTimePreKeyPrivate?: string;
  /** Responder's PQ pre-key secret key (hex). */
  pqPreKeySecret: string;
  /** Initiator's X25519 identity public key (hex). */
  remoteIdentityPublic: string;
  /** Initiator's ephemeral public key (hex). */
  remoteEphemeralPublic: string;
  /** ML-KEM-768 ciphertext from initiator (hex). */
  pqCiphertext: string;
  /** Application name; must match the initiator's. */
  info?: string;
}

/** Result of responding to a PQXDH session. */
export interface RespondToSessionResult {
  /** Hex-encoded 32-byte shared secret SK. */
  sharedSecret: string;
  /** Hex-encoded AD the first message must authenticate. */
  associatedData: string;
  /** Algorithm identifier. */
  algorithm: "pqxdh";
}

// --- Helpers ---

/** Parse a hex string into bytes, throwing with a label on invalid input. */
function hexToBytes(hex: string, label: string): Uint8Array {
  if (!isHex(hex)) {
    throw new CryptoError(
      `Invalid hex string for ${label}`,
      CryptoErrorCode.INVALID_HEX,
    );
  }
  return Buffer.from(hex, "hex");
}

/** Hex-encode bytes. */
const toHex = (bytes: Uint8Array): string => Buffer.from(bytes).toString("hex");

/** Concatenate byte arrays. */
const concat = (...parts: Uint8Array[]): Uint8Array =>
  Uint8Array.from(Buffer.concat(parts));

/** Type byte EncodeEC puts before a curve25519 key (chosen here). */
const CURVE25519_TYPE = 0x01;
/** Type byte EncodeKEM puts before an ML-KEM-768 key (chosen here). */
const ML_KEM_768_TYPE = 0x02;

/** EncodeEC: the curve's type byte, then the u-coordinate. */
const encodeEC = (publicKey: Uint8Array): Uint8Array =>
  concat(new Uint8Array([CURVE25519_TYPE]), publicKey);

/** EncodeKEM: the KEM's type byte, then its public key. */
const encodeKEM = (publicKey: Uint8Array): Uint8Array =>
  concat(new Uint8Array([ML_KEM_768_TYPE]), publicKey);

/** Default application name in the KDF info. */
const DEFAULT_INFO = "crypto-service";

/** HKDF info: the four PQXDH parameters joined with underscores. */
function kdfInfo(info: string): Uint8Array {
  if (!/^[\x20-\x7e]{8,}$/.test(info)) {
    throw new CryptoError(
      "PQXDH info must be at least 8 printable ASCII characters",
      CryptoErrorCode.INVALID_INPUT,
    );
  }
  return new TextEncoder().encode(`${info}_CURVE25519_SHA-256_ML-KEM-768`);
}

/**
 * KDF(KM): HKDF-SHA256 over 32 0xFF bytes || KM with a 32-byte zero salt.
 * The inputs are wiped once SK is derived.
 */
function deriveSessionKey(
  secrets: Uint8Array[],
  info: string | undefined,
): Uint8Array {
  const ikm = concat(new Uint8Array(32).fill(0xff), ...secrets);
  const sk = hkdf(
    sha256,
    ikm,
    new Uint8Array(32),
    kdfInfo(info ?? DEFAULT_INFO),
    32,
  );
  ikm.fill(0);
  for (const secret of secrets) secret.fill(0);
  return sk;
}

/** The message a pre-key signature covers: EncodeEC(IK) || Encode(PK). */
const preKeyMessage = (identity: Uint8Array, encodedPreKey: Uint8Array) =>
  concat(encodeEC(identity), encodedPreKey);

/** Throws unless `signature` is the identity's signature over `message`. */
function assertSigned(
  signingPublic: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
  label: string,
): void {
  const valid =
    signature.length === 64 &&
    ed25519.verify(signature, message, signingPublic, { zip215: false });
  if (!valid)
    throw new CryptoError(
      `Invalid ${label} signature`,
      CryptoErrorCode.AUTH_FAILED,
    );
}

// --- Key Generation ---

/**
 * Generate a long-term identity key pair.
 *
 * Includes both an X25519 key pair (for Diffie-Hellman) and an
 * Ed25519 key pair (for signing pre-keys).
 */
export function generateIdentityKeyPair(): IdentityKeyPair {
  const x25519Priv = randomBytes(32);
  const signingPriv = randomBytes(32);

  return {
    privateKey: toHex(x25519Priv),
    publicKey: toHex(x25519.getPublicKey(x25519Priv)),
    signingPrivateKey: toHex(signingPriv),
    signingPublicKey: toHex(ed25519.getPublicKey(signingPriv)),
  };
}

/**
 * Generate a signed pre-key: an X25519 key pair whose public key, with the
 * identity's X25519 key, is signed with the identity's Ed25519 key.
 */
export function generateSignedPreKey(identity: IdentityKeyPair): SignedPreKey {
  const sigKey = hexToBytes(identity.signingPrivateKey, "signingPrivateKey");
  const ik = hexToBytes(identity.publicKey, "identityPublicKey");
  const prePriv = randomBytes(32);
  const prePub = x25519.getPublicKey(prePriv);

  return {
    privateKey: toHex(prePriv),
    publicKey: toHex(prePub),
    signature: toHex(ed25519.sign(preKeyMessage(ik, encodeEC(prePub)), sigKey)),
  };
}

/**
 * Generate a one-time pre-key (X25519, unsigned).
 */
export function generateOneTimePreKey(): OneTimePreKey {
  const priv = randomBytes(32);

  return {
    privateKey: toHex(priv),
    publicKey: toHex(x25519.getPublicKey(priv)),
  };
}

/**
 * Generate an ML-KEM-768 pre-key, signed (with the identity's X25519 key)
 * by the identity's Ed25519 key.
 */
export function generatePqPreKey(identity: IdentityKeyPair): PqPreKey {
  const sigKey = hexToBytes(identity.signingPrivateKey, "signingPrivateKey");
  const ik = hexToBytes(identity.publicKey, "identityPublicKey");
  const { publicKey, secretKey } = ml_kem768.keygen();

  return {
    publicKey: toHex(publicKey),
    secretKey: toHex(secretKey),
    signature: toHex(
      ed25519.sign(preKeyMessage(ik, encodeKEM(publicKey)), sigKey),
    ),
  };
}

// --- Session Establishment ---

/**
 * Parses the responder's bundle and verifies both pre-key signatures,
 * throwing if either fails: the initiator aborts before any key agreement.
 */
function verifiedBundle(params: InitiateSessionParams): {
  remoteIk: Uint8Array;
  spk: Uint8Array;
  pqpk: Uint8Array;
} {
  const remoteIk = hexToBytes(
    params.remoteIdentityPublic,
    "remoteIdentityPublic",
  );
  const remoteSigning = hexToBytes(
    params.remoteIdentitySigningPublic,
    "remoteIdentitySigningPublic",
  );
  const spk = hexToBytes(
    params.remoteSignedPreKeyPublic,
    "remoteSignedPreKeyPublic",
  );
  const pqpk = hexToBytes(params.remotePqPreKeyPublic, "remotePqPreKeyPublic");

  assertSigned(
    remoteSigning,
    preKeyMessage(remoteIk, encodeEC(spk)),
    hexToBytes(
      params.remoteSignedPreKeySignature,
      "remoteSignedPreKeySignature",
    ),
    "signed pre-key",
  );
  assertSigned(
    remoteSigning,
    preKeyMessage(remoteIk, encodeKEM(pqpk)),
    hexToBytes(params.remotePqPreKeySignature, "remotePqPreKeySignature"),
    "PQ pre-key",
  );
  return { remoteIk, spk, pqpk };
}

/**
 * Initiate a PQXDH session (sender side).
 *
 * Verifies both pre-key signatures (throwing if either fails), then
 * derives SK from the DH outputs and the ML-KEM shared secret.
 */
export function initiateSession(
  params: InitiateSessionParams,
): InitiateSessionResult {
  const { remoteIk, spk, pqpk } = verifiedBundle(params);
  const ikPriv = hexToBytes(
    params.identityKeyPair.privateKey,
    "identityPrivateKey",
  );
  const ikPub = hexToBytes(
    params.identityKeyPair.publicKey,
    "identityPublicKey",
  );

  const ephPriv = randomBytes(32);
  const ephPub = x25519.getPublicKey(ephPriv);
  const { cipherText, sharedSecret: ss } = ml_kem768.encapsulate(pqpk);

  const secrets = [
    x25519.getSharedSecret(ikPriv, spk),
    x25519.getSharedSecret(ephPriv, remoteIk),
    x25519.getSharedSecret(ephPriv, spk),
  ];
  if (params.remoteOneTimePreKeyPublic) {
    const opk = hexToBytes(
      params.remoteOneTimePreKeyPublic,
      "remoteOneTimePreKeyPublic",
    );
    secrets.push(x25519.getSharedSecret(ephPriv, opk));
  }
  secrets.push(ss);
  const sharedSecret = deriveSessionKey(secrets, params.info);
  ephPriv.fill(0);

  return {
    sharedSecret: toHex(sharedSecret),
    associatedData: toHex(concat(encodeEC(ikPub), encodeEC(remoteIk))),
    ephemeralPublicKey: toHex(ephPub),
    pqCiphertext: toHex(cipherText),
    algorithm: "pqxdh",
  };
}

/**
 * Respond to a PQXDH session (receiver side).
 *
 * Reconstructs SK from the responder's private keys and the initiator's
 * ephemeral public key and ML-KEM ciphertext. The caller must then open
 * the first message with SK and `associatedData`, and abort if it fails.
 */
export function respondToSession(
  params: RespondToSessionParams,
): RespondToSessionResult {
  const ikPriv = hexToBytes(
    params.identityKeyPair.privateKey,
    "identityPrivateKey",
  );
  const ikPub = hexToBytes(
    params.identityKeyPair.publicKey,
    "identityPublicKey",
  );
  const spkPriv = hexToBytes(params.signedPreKeyPrivate, "signedPreKeyPrivate");
  const pqSecret = hexToBytes(params.pqPreKeySecret, "pqPreKeySecret");
  const remoteIk = hexToBytes(
    params.remoteIdentityPublic,
    "remoteIdentityPublic",
  );
  const remoteEph = hexToBytes(
    params.remoteEphemeralPublic,
    "remoteEphemeralPublic",
  );
  const ct = hexToBytes(params.pqCiphertext, "pqCiphertext");

  const secrets = [
    x25519.getSharedSecret(spkPriv, remoteIk),
    x25519.getSharedSecret(ikPriv, remoteEph),
    x25519.getSharedSecret(spkPriv, remoteEph),
  ];
  if (params.oneTimePreKeyPrivate) {
    const opkPriv = hexToBytes(
      params.oneTimePreKeyPrivate,
      "oneTimePreKeyPrivate",
    );
    secrets.push(x25519.getSharedSecret(opkPriv, remoteEph));
  }
  secrets.push(ml_kem768.decapsulate(ct, pqSecret));
  const sharedSecret = deriveSessionKey(secrets, params.info);

  return {
    sharedSecret: toHex(sharedSecret),
    associatedData: toHex(concat(encodeEC(remoteIk), encodeEC(ikPub))),
    algorithm: "pqxdh",
  };
}
