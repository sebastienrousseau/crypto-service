/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Complete ML-KEM (FIPS 203) — all three parameter sets + hybrid key exchange.
 *
 * Implements ML-KEM-512, ML-KEM-768, and ML-KEM-1024 for quantum-resistant
 * key encapsulation, plus a hybrid scheme combining X25519 + ML-KEM.
 *
 * The hybrid approach ensures security even if one algorithm is broken:
 * - If quantum computers arrive: X25519 fails but ML-KEM protects
 * - If ML-KEM has a flaw: X25519 still provides classical security
 *
 * Combiner (v2, all three hybrids in this module):
 *
 *   HKDF-SHA256(ikm  = ss_classical || ss_mlkem,
 *               salt = none,
 *               info = lp(label) || lp(ct_classical) || lp(pk_classical) ||
 *                      lp(ct_mlkem) || lp(pk_mlkem),
 *               L    = 32)
 *
 * where `lp(x)` is a 4-byte big-endian length followed by `x`,
 * `label` is `crypto-service/hybrid-kem/v2/<algorithm>`, `ct_classical` is
 * the sender's ephemeral public key and `pk_*` are the recipient's public
 * keys. Binding the ciphertexts and public keys means a shared secret
 * commits to the exact exchange it came from.
 *
 * These are this library's own constructions. They are NOT the RFC 10024
 * TLS 1.3 groups (X25519MLKEM768, SecP256r1MLKEM768), which derive keys
 * through the TLS key schedule, and NOT X-Wing; they do not interoperate
 * with either. Secrets derived by releases before v0.0.7 (unbound
 * `HKDF(ss_classical || ss_mlkem)`) do not match v2 secrets.
 */

import {
  ml_kem512,
  ml_kem768,
  ml_kem1024,
} from "@noble/post-quantum/ml-kem.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { x448 } from "@noble/curves/ed448.js";
import { p256 } from "@noble/curves/nist.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/ciphers/utils.js";

// --- Types ---

/** ML-KEM security level (NIST Level 1/3/5). */
export type MlKemLevel = 512 | 768 | 1024;

/** ML-KEM algorithm identifier string. */
export type MlKemAlgorithm = "ml-kem-512" | "ml-kem-768" | "ml-kem-1024";

/**
 * IANA TLS Supported Groups name for X25519 + ML-KEM-768 (RFC 10024).
 * Reference only: no function in this module implements this TLS group.
 */
export const RFC10024_X25519_MLKEM768 = "X25519MLKEM768" as const;

/**
 * IANA TLS Supported Groups name for secp256r1 + ML-KEM-768 (RFC 10024).
 * Reference only: no function in this module implements this TLS group.
 */
export const RFC10024_SECP256R1_MLKEM768 = "SecP256r1MLKEM768" as const;

/** IANA TLS Supported Groups codepoints for the RFC 10024 groups above. */
export const RFC10024_CODEPOINTS = {
  [RFC10024_SECP256R1_MLKEM768]: 0x11eb,
  [RFC10024_X25519_MLKEM768]: 0x11ec,
} as const;

/** Hybrid KEM algorithm identifier combining classical + post-quantum. */
export type HybridKemAlgorithm =
  | "x25519-ml-kem-512"
  | "x25519-ml-kem-768"
  | "x25519-ml-kem-1024"
  | "p256-ml-kem-768"
  | "x448-ml-kem-1024";

/**
 * Validates a hybrid KEM algorithm identifier and returns it unchanged.
 *
 * @throws If given an RFC 10024 TLS group name: those groups are not
 *   implemented here, and this library's hybrids are not compatible with
 *   them, so the names must not be treated as aliases.
 */
export function normalizeHybridKemAlgorithm(
  name: HybridKemAlgorithm | string,
): string {
  if (
    name === RFC10024_X25519_MLKEM768 ||
    name === RFC10024_SECP256R1_MLKEM768
  ) {
    throw new Error(
      `${name} (RFC 10024 TLS group) is not implemented by this library; ` +
        "its hybrid KEMs use a different combiner and do not interoperate",
    );
  }
  return name;
}

/** ML-KEM key pair (encapsulation + decapsulation keys). */
export interface MlKemKeyPairResult {
  /** Hex-encoded public (encapsulation) key. */
  publicKey: string;
  /** Hex-encoded secret (decapsulation) key. */
  secretKey: string;
  /** Algorithm identifier. */
  algorithm: MlKemAlgorithm;
}

/** Result of an ML-KEM encapsulation operation. */
export interface MlKemEncapsulateResult {
  /** Hex-encoded ciphertext to send to the secret key holder. */
  ciphertext: string;
  /** Hex-encoded 32-byte shared secret. */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: MlKemAlgorithm;
}

/** Result of an ML-KEM decapsulation operation. */
export interface MlKemDecapsulateResult {
  /** Hex-encoded 32-byte shared secret. */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: MlKemAlgorithm;
}

/** X25519 + ML-KEM hybrid key pair. */
export interface HybridKemKeyPair {
  /** X25519 private key (hex, 32 bytes). */
  x25519PrivateKey: string;
  /** X25519 public key (hex, 32 bytes). */
  x25519PublicKey: string;
  /** ML-KEM public key (hex). */
  mlKemPublicKey: string;
  /** ML-KEM secret key (hex). */
  mlKemSecretKey: string;
  /** Algorithm identifier. */
  algorithm: HybridKemAlgorithm;
}

/** Result of an X25519 + ML-KEM hybrid encapsulation. */
export interface HybridKemEncapsulateResult {
  /** X25519 ephemeral public key (hex, 32 bytes). */
  x25519EphemeralPublic: string;
  /** ML-KEM ciphertext (hex). */
  mlKemCiphertext: string;
  /** Hex-encoded 32-byte combined shared secret (HKDF of both). */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: HybridKemAlgorithm;
}

/** Result of an X25519 + ML-KEM hybrid decapsulation. */
export interface HybridKemDecapsulateResult {
  /** Hex-encoded 32-byte combined shared secret. */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: HybridKemAlgorithm;
}

// --- Helpers ---

/** Regex matching valid hexadecimal strings. */
const HEX_RE = /^[0-9a-fA-F]*$/;

/** Parse a hex string into bytes, throwing on invalid input. */
function assertHex(input: string, label: string): Uint8Array {
  if (!HEX_RE.test(input)) {
    throw new Error(`Invalid hex string for ${label}`);
  }
  return Buffer.from(input, "hex");
}

/** Retrieve the ML-KEM implementation for the given security level. */
function getKem(level: MlKemLevel) {
  switch (level) {
    case 512:
      return ml_kem512;
    case 768:
      return ml_kem768;
    case 1024:
      return ml_kem1024;
    default:
      throw new Error(
        `Unsupported ML-KEM level: ${level}. Supported: 512, 768, 1024`,
      );
  }
}

/** Build the ML-KEM algorithm identifier string from a security level. */
function algorithmName(level: MlKemLevel): MlKemAlgorithm {
  return `ml-kem-${level}` as MlKemAlgorithm;
}

/** Transcript of one hybrid encapsulation, fed to {@link combineHybrid}. */
interface HybridTranscript {
  /** Algorithm identifier, used in the domain-separation label. */
  algorithm: HybridKemAlgorithm;
  /** Classical (ECDH) shared secret. */
  ssClassical: Uint8Array;
  /** ML-KEM shared secret. */
  ssMlKem: Uint8Array;
  /** Sender's ephemeral classical public key (the classical "ciphertext"). */
  ctClassical: Uint8Array;
  /** Recipient's classical public key. */
  pkClassical: Uint8Array;
  /** ML-KEM ciphertext. */
  ctMlKem: Uint8Array;
  /** Recipient's ML-KEM public key. */
  pkMlKem: Uint8Array;
}

/** 4-byte big-endian length prefix followed by the bytes. */
function lengthPrefixed(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + bytes.length);
  new DataView(out.buffer).setUint32(0, bytes.length, false);
  out.set(bytes, 4);
  return out;
}

/**
 * v2 combiner: HKDF-SHA256 over both shared secrets, with a domain label,
 * both ciphertexts and both recipient public keys bound in `info`.
 */
function combineHybrid(t: HybridTranscript): Uint8Array {
  const ikm = Buffer.concat([t.ssClassical, t.ssMlKem]);
  const info = Buffer.concat([
    lengthPrefixed(Buffer.from(`crypto-service/hybrid-kem/v2/${t.algorithm}`)),
    lengthPrefixed(t.ctClassical),
    lengthPrefixed(t.pkClassical),
    lengthPrefixed(t.ctMlKem),
    lengthPrefixed(t.pkMlKem),
  ]);
  return hkdf(sha256, ikm, undefined, info, 32);
}

/** Hex-encode bytes. */
function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/** Build the hybrid KEM algorithm identifier string from a security level. */
function hybridAlgorithmName(level: MlKemLevel): HybridKemAlgorithm {
  return `x25519-ml-kem-${level}` as HybridKemAlgorithm;
}

// --- ML-KEM standalone ---

/**
 * Generate an ML-KEM key pair for the specified security level.
 */
export function mlKemKeygen(level: MlKemLevel): MlKemKeyPairResult {
  const kem = getKem(level);
  const { publicKey, secretKey } = kem.keygen();
  return {
    publicKey: Buffer.from(publicKey).toString("hex"),
    secretKey: Buffer.from(secretKey).toString("hex"),
    algorithm: algorithmName(level),
  };
}

/**
 * Encapsulate — generate a shared secret and ciphertext using the recipient's public key.
 */
export function mlKemEncapsulate(
  level: MlKemLevel,
  publicKeyHex: string,
): MlKemEncapsulateResult {
  const kem = getKem(level);
  const publicKey = assertHex(publicKeyHex, "publicKey");
  const { cipherText, sharedSecret } = kem.encapsulate(publicKey);
  return {
    ciphertext: Buffer.from(cipherText).toString("hex"),
    sharedSecret: Buffer.from(sharedSecret).toString("hex"),
    algorithm: algorithmName(level),
  };
}

/**
 * Decapsulate — recover the shared secret using the secret key and ciphertext.
 */
export function mlKemDecapsulate(
  level: MlKemLevel,
  secretKeyHex: string,
  ciphertextHex: string,
): MlKemDecapsulateResult {
  const kem = getKem(level);
  const secretKey = assertHex(secretKeyHex, "secretKey");
  const cipherText = assertHex(ciphertextHex, "ciphertext");
  const sharedSecret = kem.decapsulate(cipherText, secretKey);
  return {
    sharedSecret: Buffer.from(sharedSecret).toString("hex"),
    algorithm: algorithmName(level),
  };
}

// --- Hybrid X25519 + ML-KEM ---

/**
 * Generate a hybrid X25519 + ML-KEM key pair.
 */
export function hybridKemKeygen(kemLevel: MlKemLevel = 768): HybridKemKeyPair {
  const kem = getKem(kemLevel);
  const x25519Priv = randomBytes(32);
  const x25519Pub = x25519.getPublicKey(x25519Priv);
  const { publicKey: mlKemPub, secretKey: mlKemSec } = kem.keygen();

  return {
    x25519PrivateKey: Buffer.from(x25519Priv).toString("hex"),
    x25519PublicKey: Buffer.from(x25519Pub).toString("hex"),
    mlKemPublicKey: Buffer.from(mlKemPub).toString("hex"),
    mlKemSecretKey: Buffer.from(mlKemSec).toString("hex"),
    algorithm: hybridAlgorithmName(kemLevel),
  };
}

/**
 * Hybrid encapsulate — performs X25519 ECDH + ML-KEM encapsulation, then
 * derives the combined shared secret with the v2 combiner (see module docs).
 *
 * @param kemLevel - ML-KEM security level (512, 768, or 1024).
 * @param theirX25519Public - Recipient's X25519 public key (hex).
 * @param theirMlKemPublic - Recipient's ML-KEM public key (hex).
 */
export function hybridKemEncapsulate(
  kemLevel: MlKemLevel,
  theirX25519Public: string,
  theirMlKemPublic: string,
): HybridKemEncapsulateResult {
  const kem = getKem(kemLevel);
  const pkClassical = assertHex(theirX25519Public, "theirX25519Public");
  const pkMlKem = assertHex(theirMlKemPublic, "theirMlKemPublic");

  const ephemeralPriv = randomBytes(32);
  const ephemeralPub = x25519.getPublicKey(ephemeralPriv);
  const ssClassical = x25519.getSharedSecret(ephemeralPriv, pkClassical);
  const { cipherText, sharedSecret: ssMlKem } = kem.encapsulate(pkMlKem);

  const algorithm = hybridAlgorithmName(kemLevel);
  const derived = combineHybrid({
    algorithm,
    ssClassical,
    ssMlKem,
    ctClassical: ephemeralPub,
    pkClassical,
    ctMlKem: cipherText,
    pkMlKem,
  });

  return {
    x25519EphemeralPublic: toHex(ephemeralPub),
    mlKemCiphertext: toHex(cipherText),
    sharedSecret: toHex(derived),
    algorithm,
  };
}

/**
 * Hybrid decapsulate — recovers the combined shared secret using our
 * private keys and the sender's ephemeral data.
 *
 * @param kemLevel - ML-KEM security level (512, 768, or 1024).
 * @param ourX25519Private - Our X25519 private key (hex).
 * @param ourMlKemSecret - Our ML-KEM secret key (hex).
 * @param theirX25519Ephemeral - Sender's ephemeral X25519 public key (hex).
 * @param mlKemCiphertext - ML-KEM ciphertext from the sender (hex).
 */
export function hybridKemDecapsulate(
  kemLevel: MlKemLevel,
  ourX25519Private: string,
  ourMlKemSecret: string,
  theirX25519Ephemeral: string,
  mlKemCiphertext: string,
): HybridKemDecapsulateResult {
  const kem = getKem(kemLevel);
  const priv = assertHex(ourX25519Private, "ourX25519Private");
  const ctClassical = assertHex(theirX25519Ephemeral, "theirX25519Ephemeral");
  const ctMlKem = assertHex(mlKemCiphertext, "mlKemCiphertext");
  const mlKemSecret = assertHex(ourMlKemSecret, "ourMlKemSecret");

  const algorithm = hybridAlgorithmName(kemLevel);
  const derived = combineHybrid({
    algorithm,
    ssClassical: x25519.getSharedSecret(priv, ctClassical),
    ssMlKem: kem.decapsulate(ctMlKem, mlKemSecret),
    ctClassical,
    pkClassical: x25519.getPublicKey(priv),
    ctMlKem,
    pkMlKem: kem.getPublicKey(mlKemSecret),
  });

  return { sharedSecret: toHex(derived), algorithm };
}

// --- P-256 + ML-KEM-768 Hybrid (TLS interop) ---

/** P-256 + ML-KEM-768 hybrid key pair for TLS interoperability. */
export interface P256MlKemKeyPair {
  /** P-256 private key (hex). */
  p256PrivateKey: string;
  /** P-256 uncompressed public key (hex). */
  p256PublicKey: string;
  /** ML-KEM-768 public key (hex). */
  mlKemPublicKey: string;
  /** ML-KEM-768 secret key (hex). */
  mlKemSecretKey: string;
  /** Algorithm identifier. */
  algorithm: "p256-ml-kem-768";
}

/** Result of a P-256 + ML-KEM-768 hybrid encapsulation. */
export interface P256MlKemEncapsulateResult {
  /** P-256 ephemeral public key (hex). */
  p256EphemeralPublic: string;
  /** ML-KEM ciphertext (hex). */
  mlKemCiphertext: string;
  /** Combined shared secret (hex, 32 bytes). */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: "p256-ml-kem-768";
}

/** Result of a P-256 + ML-KEM-768 hybrid decapsulation. */
export interface P256MlKemDecapsulateResult {
  /** Combined shared secret (hex, 32 bytes). */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: "p256-ml-kem-768";
}

/**
 * Generate a P-256 + ML-KEM-768 hybrid key pair for TLS interoperability.
 */
export function p256MlKemKeygen(): P256MlKemKeyPair {
  const p256Priv = p256.utils.randomSecretKey();
  const p256Pub = p256.getPublicKey(p256Priv, false);
  const { publicKey: mlKemPub, secretKey: mlKemSec } = ml_kem768.keygen();

  return {
    p256PrivateKey: Buffer.from(p256Priv).toString("hex"),
    p256PublicKey: Buffer.from(p256Pub).toString("hex"),
    mlKemPublicKey: Buffer.from(mlKemPub).toString("hex"),
    mlKemSecretKey: Buffer.from(mlKemSec).toString("hex"),
    algorithm: "p256-ml-kem-768",
  };
}

/**
 * P-256 + ML-KEM-768 hybrid encapsulation (v2 combiner, see module docs).
 * The recipient P-256 key may be compressed or uncompressed; it is bound in
 * its uncompressed form.
 */
export function p256MlKemEncapsulate(
  theirP256Public: string,
  theirMlKemPublic: string,
): P256MlKemEncapsulateResult {
  const pkClassical = p256.Point.fromBytes(
    assertHex(theirP256Public, "theirP256Public"),
  ).toBytes(false);
  const pkMlKem = assertHex(theirMlKemPublic, "theirMlKemPublic");

  const ephemeralPriv = p256.utils.randomSecretKey();
  const ephemeralPub = p256.getPublicKey(ephemeralPriv, false);
  const ssClassical = p256.getSharedSecret(ephemeralPriv, pkClassical);
  const { cipherText, sharedSecret: ssMlKem } = ml_kem768.encapsulate(pkMlKem);

  const derived = combineHybrid({
    algorithm: "p256-ml-kem-768",
    ssClassical,
    ssMlKem,
    ctClassical: ephemeralPub,
    pkClassical,
    ctMlKem: cipherText,
    pkMlKem,
  });

  return {
    p256EphemeralPublic: toHex(ephemeralPub),
    mlKemCiphertext: toHex(cipherText),
    sharedSecret: toHex(derived),
    algorithm: "p256-ml-kem-768",
  };
}

/**
 * P-256 + ML-KEM-768 hybrid decapsulation.
 */
export function p256MlKemDecapsulate(
  ourP256Private: string,
  ourMlKemSecret: string,
  theirP256Ephemeral: string,
  mlKemCiphertext: string,
): P256MlKemDecapsulateResult {
  const priv = assertHex(ourP256Private, "ourP256Private");
  const ctClassical = assertHex(theirP256Ephemeral, "theirP256Ephemeral");
  const ctMlKem = assertHex(mlKemCiphertext, "mlKemCiphertext");
  const mlKemSecret = assertHex(ourMlKemSecret, "ourMlKemSecret");

  const derived = combineHybrid({
    algorithm: "p256-ml-kem-768",
    ssClassical: p256.getSharedSecret(priv, ctClassical),
    ssMlKem: ml_kem768.decapsulate(ctMlKem, mlKemSecret),
    ctClassical,
    pkClassical: p256.getPublicKey(priv, false),
    ctMlKem,
    pkMlKem: ml_kem768.getPublicKey(mlKemSecret),
  });

  return { sharedSecret: toHex(derived), algorithm: "p256-ml-kem-768" };
}

// --- X448 + ML-KEM-1024 Hybrid (maximum security) ---

/** X448 + ML-KEM-1024 hybrid key pair (maximum security, NIST Level 5). */
export interface X448MlKemKeyPair {
  /** X448 private key (hex, 56 bytes). */
  x448PrivateKey: string;
  /** X448 public key (hex, 56 bytes). */
  x448PublicKey: string;
  /** ML-KEM-1024 public key (hex). */
  mlKemPublicKey: string;
  /** ML-KEM-1024 secret key (hex). */
  mlKemSecretKey: string;
  /** Algorithm identifier. */
  algorithm: "x448-ml-kem-1024";
}

/** Result of an X448 + ML-KEM-1024 hybrid encapsulation. */
export interface X448MlKemEncapsulateResult {
  /** X448 ephemeral public key (hex). */
  x448EphemeralPublic: string;
  /** ML-KEM-1024 ciphertext (hex). */
  mlKemCiphertext: string;
  /** Combined shared secret (hex, 32 bytes). */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: "x448-ml-kem-1024";
}

/** Result of an X448 + ML-KEM-1024 hybrid decapsulation. */
export interface X448MlKemDecapsulateResult {
  /** Combined shared secret (hex, 32 bytes). */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: "x448-ml-kem-1024";
}

/**
 * Generate an X448 + ML-KEM-1024 hybrid key pair (maximum security, NIST Level 5).
 */
export function x448MlKemKeygen(): X448MlKemKeyPair {
  const x448Priv = x448.utils.randomSecretKey();
  const x448Pub = x448.getPublicKey(x448Priv);
  const { publicKey: mlKemPub, secretKey: mlKemSec } = ml_kem1024.keygen();

  return {
    x448PrivateKey: Buffer.from(x448Priv).toString("hex"),
    x448PublicKey: Buffer.from(x448Pub).toString("hex"),
    mlKemPublicKey: Buffer.from(mlKemPub).toString("hex"),
    mlKemSecretKey: Buffer.from(mlKemSec).toString("hex"),
    algorithm: "x448-ml-kem-1024",
  };
}

/**
 * X448 + ML-KEM-1024 hybrid encapsulation (v2 combiner, see module docs).
 */
export function x448MlKemEncapsulate(
  theirX448Public: string,
  theirMlKemPublic: string,
): X448MlKemEncapsulateResult {
  const pkClassical = assertHex(theirX448Public, "theirX448Public");
  const pkMlKem = assertHex(theirMlKemPublic, "theirMlKemPublic");

  const ephemeralPriv = x448.utils.randomSecretKey();
  const ephemeralPub = x448.getPublicKey(ephemeralPriv);
  const ssClassical = x448.getSharedSecret(ephemeralPriv, pkClassical);
  const { cipherText, sharedSecret: ssMlKem } = ml_kem1024.encapsulate(pkMlKem);

  const derived = combineHybrid({
    algorithm: "x448-ml-kem-1024",
    ssClassical,
    ssMlKem,
    ctClassical: ephemeralPub,
    pkClassical,
    ctMlKem: cipherText,
    pkMlKem,
  });

  return {
    x448EphemeralPublic: toHex(ephemeralPub),
    mlKemCiphertext: toHex(cipherText),
    sharedSecret: toHex(derived),
    algorithm: "x448-ml-kem-1024",
  };
}

/**
 * X448 + ML-KEM-1024 hybrid decapsulation.
 */
export function x448MlKemDecapsulate(
  ourX448Private: string,
  ourMlKemSecret: string,
  theirX448Ephemeral: string,
  mlKemCiphertext: string,
): X448MlKemDecapsulateResult {
  const priv = assertHex(ourX448Private, "ourX448Private");
  const ctClassical = assertHex(theirX448Ephemeral, "theirX448Ephemeral");
  const ctMlKem = assertHex(mlKemCiphertext, "mlKemCiphertext");
  const mlKemSecret = assertHex(ourMlKemSecret, "ourMlKemSecret");

  const derived = combineHybrid({
    algorithm: "x448-ml-kem-1024",
    ssClassical: x448.getSharedSecret(priv, ctClassical),
    ssMlKem: ml_kem1024.decapsulate(ctMlKem, mlKemSecret),
    ctClassical,
    pkClassical: x448.getPublicKey(priv),
    ctMlKem,
    pkMlKem: ml_kem1024.getPublicKey(mlKemSecret),
  });

  return { sharedSecret: toHex(derived), algorithm: "x448-ml-kem-1024" };
}
