/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks PQXDH — Post-Quantum Extended Triple Diffie-Hellman key agreement.
 *
 * Implements Signal's PQXDH protocol which combines X25519 key exchanges
 * with ML-KEM-768 encapsulation to produce a shared secret resilient against
 * both classical and quantum adversaries.
 *
 * Protocol overview (initiator → responder):
 *   DH1 = X25519(IK_A, SPK_B)
 *   DH2 = X25519(EK_A, IK_B)
 *   DH3 = X25519(EK_A, SPK_B)
 *   DH4 = X25519(EK_A, OPK_B)  [optional]
 *   PQ  = ML-KEM-768.Encaps(PQPK_B)
 *   SK  = HKDF(DH1 || DH2 || DH3 || DH4 || PQ, salt, info)
 */

import { ed25519, x25519 } from "@noble/curves/ed25519";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { randomBytes } from "@noble/ciphers/webcrypto";

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
  /** Hex-encoded Ed25519 signature over the public key. */
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
  /** Hex-encoded Ed25519 signature over the public key. */
  signature: string;
}

/** Parameters for initiating a PQXDH session (sender side). */
export interface InitiateSessionParams {
  /** Initiator's identity key pair. */
  identityKeyPair: IdentityKeyPair;
  /** Responder's identity public key (hex). */
  remoteIdentityPublic: string;
  /** Responder's signed pre-key public key (hex). */
  remoteSignedPreKeyPublic: string;
  /** Responder's one-time pre-key public key (hex, optional). */
  remoteOneTimePreKeyPublic?: string;
  /** Responder's PQ pre-key public key (hex). */
  remotePqPreKeyPublic: string;
}

/** Result of initiating a PQXDH session (shared secret + ephemeral data). */
export interface InitiateSessionResult {
  /** Hex-encoded 32-byte shared secret. */
  sharedSecret: string;
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
  /** Initiator's identity public key (hex). */
  remoteIdentityPublic: string;
  /** Initiator's ephemeral public key (hex). */
  remoteEphemeralPublic: string;
  /** ML-KEM-768 ciphertext from initiator (hex). */
  pqCiphertext: string;
}

/** Result of responding to a PQXDH session. */
export interface RespondToSessionResult {
  /** Hex-encoded 32-byte shared secret. */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: "pqxdh";
}

// --- Helpers ---

const HEX_RE = /^[0-9a-fA-F]*$/;

function hexToBytes(hex: string, label: string): Uint8Array {
  if (!HEX_RE.test(hex)) {
    throw new Error(`Invalid hex string for ${label}`);
  }
  return Buffer.from(hex, "hex");
}

const PQXDH_INFO = "pqxdh-v1";

// --- Key Generation ---

/**
 * Generate a long-term identity key pair.
 *
 * Includes both an X25519 key pair (for Diffie-Hellman) and an
 * Ed25519 key pair (for signing pre-keys).
 */
export function generateIdentityKeyPair(): IdentityKeyPair {
  const x25519Priv = randomBytes(32);
  const x25519Pub = x25519.getPublicKey(x25519Priv);
  const signingPriv = randomBytes(32);
  const signingPub = ed25519.getPublicKey(signingPriv);

  return {
    privateKey: Buffer.from(x25519Priv).toString("hex"),
    publicKey: Buffer.from(x25519Pub).toString("hex"),
    signingPrivateKey: Buffer.from(signingPriv).toString("hex"),
    signingPublicKey: Buffer.from(signingPub).toString("hex"),
  };
}

/**
 * Generate a signed pre-key, authenticated by the identity key.
 *
 * The signed pre-key is an X25519 key pair whose public key is signed
 * with the identity's Ed25519 signing key.
 */
export function generateSignedPreKey(
  identitySigningPrivate: string,
): SignedPreKey {
  const sigKey = hexToBytes(identitySigningPrivate, "identitySigningPrivate");
  const prePriv = randomBytes(32);
  const prePub = x25519.getPublicKey(prePriv);
  const signature = ed25519.sign(prePub, sigKey);

  return {
    privateKey: Buffer.from(prePriv).toString("hex"),
    publicKey: Buffer.from(prePub).toString("hex"),
    signature: Buffer.from(signature).toString("hex"),
  };
}

/**
 * Generate a one-time pre-key (X25519, unsigned).
 */
export function generateOneTimePreKey(): OneTimePreKey {
  const priv = randomBytes(32);
  const pub = x25519.getPublicKey(priv);

  return {
    privateKey: Buffer.from(priv).toString("hex"),
    publicKey: Buffer.from(pub).toString("hex"),
  };
}

/**
 * Generate an ML-KEM-768 pre-key, signed by the identity key.
 */
export function generatePqPreKey(identitySigningPrivate: string): PqPreKey {
  const sigKey = hexToBytes(identitySigningPrivate, "identitySigningPrivate");
  const { publicKey, secretKey } = ml_kem768.keygen();

  // Sign the ML-KEM public key
  const signature = ed25519.sign(
    sha256(publicKey), // hash first — ML-KEM keys are large
    sigKey,
  );

  return {
    publicKey: Buffer.from(publicKey).toString("hex"),
    secretKey: Buffer.from(secretKey).toString("hex"),
    signature: Buffer.from(signature).toString("hex"),
  };
}

// --- Session Establishment ---

/**
 * Initiate a PQXDH session (sender side).
 *
 * Computes the shared secret from multiple DH exchanges plus ML-KEM
 * encapsulation, then derives the final key via HKDF-SHA256.
 */
export function initiateSession(
  params: InitiateSessionParams,
): InitiateSessionResult {
  const {
    identityKeyPair,
    remoteIdentityPublic,
    remoteSignedPreKeyPublic,
    remoteOneTimePreKeyPublic,
    remotePqPreKeyPublic,
  } = params;

  const ikPriv = hexToBytes(identityKeyPair.privateKey, "identityPrivateKey");
  const remoteIkPub = hexToBytes(remoteIdentityPublic, "remoteIdentityPublic");
  const remoteSPKPub = hexToBytes(
    remoteSignedPreKeyPublic,
    "remoteSignedPreKeyPublic",
  );
  const remotePqPub = hexToBytes(remotePqPreKeyPublic, "remotePqPreKeyPublic");

  // Generate ephemeral key pair
  const ephPriv = randomBytes(32);
  const ephPub = x25519.getPublicKey(ephPriv);

  // DH1: IK_A × SPK_B
  const dh1 = x25519.getSharedSecret(ikPriv, remoteSPKPub);
  // DH2: EK_A × IK_B
  const dh2 = x25519.getSharedSecret(ephPriv, remoteIkPub);
  // DH3: EK_A × SPK_B
  const dh3 = x25519.getSharedSecret(ephPriv, remoteSPKPub);

  // DH4: EK_A × OPK_B (optional)
  let dh4: Uint8Array | null = null;
  if (remoteOneTimePreKeyPublic) {
    const remoteOPKPub = hexToBytes(
      remoteOneTimePreKeyPublic,
      "remoteOneTimePreKeyPublic",
    );
    dh4 = x25519.getSharedSecret(ephPriv, remoteOPKPub);
  }

  // PQ: ML-KEM-768 encapsulation
  const { cipherText: pqCt, sharedSecret: pqShared } =
    ml_kem768.encapsulate(remotePqPub);

  // Combine all shared secrets
  const dhLen = dh1.length + dh2.length + dh3.length;
  const dh4Len = dh4 ? dh4.length : 0;
  const totalLen = dhLen + dh4Len + pqShared.length;
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  combined.set(dh1, offset);
  offset += dh1.length;
  combined.set(dh2, offset);
  offset += dh2.length;
  combined.set(dh3, offset);
  offset += dh3.length;
  if (dh4) {
    combined.set(dh4, offset);
    offset += dh4.length;
  }
  combined.set(pqShared, offset);

  // Derive final shared secret via HKDF
  const sharedSecret = hkdf(sha256, combined, undefined, PQXDH_INFO, 32);

  return {
    sharedSecret: Buffer.from(sharedSecret).toString("hex"),
    ephemeralPublicKey: Buffer.from(ephPub).toString("hex"),
    pqCiphertext: Buffer.from(pqCt).toString("hex"),
    algorithm: "pqxdh",
  };
}

/**
 * Respond to a PQXDH session (receiver side).
 *
 * Reconstructs the same shared secret using the responder's private keys
 * and the initiator's ephemeral public key + PQ ciphertext.
 */
export function respondToSession(
  params: RespondToSessionParams,
): RespondToSessionResult {
  const {
    identityKeyPair,
    signedPreKeyPrivate,
    oneTimePreKeyPrivate,
    pqPreKeySecret,
    remoteIdentityPublic,
    remoteEphemeralPublic,
    pqCiphertext,
  } = params;

  const ikPriv = hexToBytes(identityKeyPair.privateKey, "identityPrivateKey");
  const spkPriv = hexToBytes(signedPreKeyPrivate, "signedPreKeyPrivate");
  const pqSecret = hexToBytes(pqPreKeySecret, "pqPreKeySecret");
  const remoteIkPub = hexToBytes(remoteIdentityPublic, "remoteIdentityPublic");
  const remoteEphPub = hexToBytes(
    remoteEphemeralPublic,
    "remoteEphemeralPublic",
  );
  const pqCt = hexToBytes(pqCiphertext, "pqCiphertext");

  // DH1: SPK_B × IK_A (mirror of initiator DH1)
  const dh1 = x25519.getSharedSecret(spkPriv, remoteIkPub);
  // DH2: IK_B × EK_A (mirror of initiator DH2)
  const dh2 = x25519.getSharedSecret(ikPriv, remoteEphPub);
  // DH3: SPK_B × EK_A (mirror of initiator DH3)
  const dh3 = x25519.getSharedSecret(spkPriv, remoteEphPub);

  // DH4: OPK_B × EK_A (optional, mirror of initiator DH4)
  let dh4: Uint8Array | null = null;
  if (oneTimePreKeyPrivate) {
    const opkPriv = hexToBytes(oneTimePreKeyPrivate, "oneTimePreKeyPrivate");
    dh4 = x25519.getSharedSecret(opkPriv, remoteEphPub);
  }

  // PQ: ML-KEM-768 decapsulation
  const pqShared = ml_kem768.decapsulate(pqCt, pqSecret);

  // Combine all shared secrets (same order as initiator)
  const dhLen = dh1.length + dh2.length + dh3.length;
  const dh4Len = dh4 ? dh4.length : 0;
  const totalLen = dhLen + dh4Len + pqShared.length;
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  combined.set(dh1, offset);
  offset += dh1.length;
  combined.set(dh2, offset);
  offset += dh2.length;
  combined.set(dh3, offset);
  offset += dh3.length;
  if (dh4) {
    combined.set(dh4, offset);
    offset += dh4.length;
  }
  combined.set(pqShared, offset);

  // Derive final shared secret via HKDF (same params as initiator)
  const sharedSecret = hkdf(sha256, combined, undefined, PQXDH_INFO, 32);

  return {
    sharedSecret: Buffer.from(sharedSecret).toString("hex"),
    algorithm: "pqxdh",
  };
}
