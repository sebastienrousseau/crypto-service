/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Complete ML-KEM (FIPS 203) — all three parameter sets + hybrid key exchange.
 *
 * Implements ML-KEM-512, ML-KEM-768, and ML-KEM-1024 for quantum-resistant
 * key encapsulation, plus a hybrid scheme combining X25519 + ML-KEM.
 *
 * The hybrid approach ensures security even if one algorithm is broken:
 * - If quantum computers arrive: X25519 fails but ML-KEM protects
 * - If ML-KEM has a flaw: X25519 still provides classical security
 *
 * Shared secret derivation: HKDF-SHA256(X25519_shared || ML-KEM_shared, salt, info)
 */

import {
  ml_kem512,
  ml_kem768,
  ml_kem1024,
} from "@noble/post-quantum/ml-kem.js";
import { x25519 } from "@noble/curves/ed25519";
import { x448 } from "@noble/curves/ed448";
import { p256 } from "@noble/curves/p256";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { randomBytes } from "@noble/ciphers/webcrypto";

// --- Types ---

export type MlKemLevel = 512 | 768 | 1024;

export type MlKemAlgorithm = "ml-kem-512" | "ml-kem-768" | "ml-kem-1024";

export type HybridKemAlgorithm =
  | "x25519-ml-kem-512"
  | "x25519-ml-kem-768"
  | "x25519-ml-kem-1024"
  | "p256-ml-kem-768"
  | "x448-ml-kem-1024";

export interface MlKemKeyPairResult {
  /** Hex-encoded public (encapsulation) key. */
  publicKey: string;
  /** Hex-encoded secret (decapsulation) key. */
  secretKey: string;
  /** Algorithm identifier. */
  algorithm: MlKemAlgorithm;
}

export interface MlKemEncapsulateResult {
  /** Hex-encoded ciphertext to send to the secret key holder. */
  ciphertext: string;
  /** Hex-encoded 32-byte shared secret. */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: MlKemAlgorithm;
}

export interface MlKemDecapsulateResult {
  /** Hex-encoded 32-byte shared secret. */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: MlKemAlgorithm;
}

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

export interface HybridKemDecapsulateResult {
  /** Hex-encoded 32-byte combined shared secret. */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: HybridKemAlgorithm;
}

// --- Helpers ---

const HEX_RE = /^[0-9a-fA-F]*$/;

function assertHex(input: string, label: string): Uint8Array {
  if (!HEX_RE.test(input)) {
    throw new Error(`Invalid hex string for ${label}`);
  }
  return Buffer.from(input, "hex");
}

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

function algorithmName(level: MlKemLevel): MlKemAlgorithm {
  return `ml-kem-${level}` as MlKemAlgorithm;
}

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
 * Hybrid encapsulate — performs X25519 ECDH + ML-KEM encapsulation,
 * then derives a combined shared secret via HKDF.
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

  // X25519: generate ephemeral key pair and compute shared secret
  const ephemeralPriv = randomBytes(32);
  const ephemeralPub = x25519.getPublicKey(ephemeralPriv);
  const x25519Shared = x25519.getSharedSecret(
    ephemeralPriv,
    assertHex(theirX25519Public, "theirX25519Public"),
  );

  // ML-KEM: encapsulate with their public key
  const { cipherText, sharedSecret: mlKemShared } = kem.encapsulate(
    assertHex(theirMlKemPublic, "theirMlKemPublic"),
  );

  // Combine both shared secrets via HKDF-SHA256
  const combined = new Uint8Array(x25519Shared.length + mlKemShared.length);
  combined.set(x25519Shared);
  combined.set(mlKemShared, x25519Shared.length);

  const info = `x25519-ml-kem-${kemLevel}-hybrid`;
  const derivedSecret = hkdf(sha256, combined, undefined, info, 32);

  return {
    x25519EphemeralPublic: Buffer.from(ephemeralPub).toString("hex"),
    mlKemCiphertext: Buffer.from(cipherText).toString("hex"),
    sharedSecret: Buffer.from(derivedSecret).toString("hex"),
    algorithm: hybridAlgorithmName(kemLevel),
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

  // X25519: compute shared secret
  const x25519Shared = x25519.getSharedSecret(
    assertHex(ourX25519Private, "ourX25519Private"),
    assertHex(theirX25519Ephemeral, "theirX25519Ephemeral"),
  );

  // ML-KEM: decapsulate
  const mlKemShared = kem.decapsulate(
    assertHex(mlKemCiphertext, "mlKemCiphertext"),
    assertHex(ourMlKemSecret, "ourMlKemSecret"),
  );

  // Combine via same HKDF derivation
  const combined = new Uint8Array(x25519Shared.length + mlKemShared.length);
  combined.set(x25519Shared);
  combined.set(mlKemShared, x25519Shared.length);

  const info = `x25519-ml-kem-${kemLevel}-hybrid`;
  const derivedSecret = hkdf(sha256, combined, undefined, info, 32);

  return {
    sharedSecret: Buffer.from(derivedSecret).toString("hex"),
    algorithm: hybridAlgorithmName(kemLevel),
  };
}

// --- P-256 + ML-KEM-768 Hybrid (TLS interop) ---

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
  const p256Priv = p256.utils.randomPrivateKey();
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
 * P-256 + ML-KEM-768 hybrid encapsulation.
 */
export function p256MlKemEncapsulate(
  theirP256Public: string,
  theirMlKemPublic: string,
): P256MlKemEncapsulateResult {
  // P-256 ECDH: generate ephemeral key pair
  const ephemeralPriv = p256.utils.randomPrivateKey();
  const ephemeralPub = p256.getPublicKey(ephemeralPriv, false);
  const ecdhShared = p256.getSharedSecret(
    ephemeralPriv,
    assertHex(theirP256Public, "theirP256Public"),
  );

  // ML-KEM-768: encapsulate
  const { cipherText, sharedSecret: mlKemShared } = ml_kem768.encapsulate(
    assertHex(theirMlKemPublic, "theirMlKemPublic"),
  );

  // Combine via HKDF
  const combined = new Uint8Array(ecdhShared.length + mlKemShared.length);
  combined.set(ecdhShared);
  combined.set(mlKemShared, ecdhShared.length);
  const derivedSecret = hkdf(
    sha256,
    combined,
    undefined,
    "p256-ml-kem-768-hybrid",
    32,
  );

  return {
    p256EphemeralPublic: Buffer.from(ephemeralPub).toString("hex"),
    mlKemCiphertext: Buffer.from(cipherText).toString("hex"),
    sharedSecret: Buffer.from(derivedSecret).toString("hex"),
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
  // P-256 ECDH
  const ecdhShared = p256.getSharedSecret(
    assertHex(ourP256Private, "ourP256Private"),
    assertHex(theirP256Ephemeral, "theirP256Ephemeral"),
  );

  // ML-KEM-768 decapsulate
  const mlKemShared = ml_kem768.decapsulate(
    assertHex(mlKemCiphertext, "mlKemCiphertext"),
    assertHex(ourMlKemSecret, "ourMlKemSecret"),
  );

  // Same HKDF derivation
  const combined = new Uint8Array(ecdhShared.length + mlKemShared.length);
  combined.set(ecdhShared);
  combined.set(mlKemShared, ecdhShared.length);
  const derivedSecret = hkdf(
    sha256,
    combined,
    undefined,
    "p256-ml-kem-768-hybrid",
    32,
  );

  return {
    sharedSecret: Buffer.from(derivedSecret).toString("hex"),
    algorithm: "p256-ml-kem-768",
  };
}

// --- X448 + ML-KEM-1024 Hybrid (maximum security) ---

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
  const x448Priv = x448.utils.randomPrivateKey();
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
 * X448 + ML-KEM-1024 hybrid encapsulation.
 */
export function x448MlKemEncapsulate(
  theirX448Public: string,
  theirMlKemPublic: string,
): X448MlKemEncapsulateResult {
  // X448: generate ephemeral key pair
  const ephemeralPriv = x448.utils.randomPrivateKey();
  const ephemeralPub = x448.getPublicKey(ephemeralPriv);
  const x448Shared = x448.getSharedSecret(
    ephemeralPriv,
    assertHex(theirX448Public, "theirX448Public"),
  );

  // ML-KEM-1024: encapsulate
  const { cipherText, sharedSecret: mlKemShared } = ml_kem1024.encapsulate(
    assertHex(theirMlKemPublic, "theirMlKemPublic"),
  );

  // Combine via HKDF
  const combined = new Uint8Array(x448Shared.length + mlKemShared.length);
  combined.set(x448Shared);
  combined.set(mlKemShared, x448Shared.length);
  const derivedSecret = hkdf(
    sha256,
    combined,
    undefined,
    "x448-ml-kem-1024-hybrid",
    32,
  );

  return {
    x448EphemeralPublic: Buffer.from(ephemeralPub).toString("hex"),
    mlKemCiphertext: Buffer.from(cipherText).toString("hex"),
    sharedSecret: Buffer.from(derivedSecret).toString("hex"),
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
  // X448 ECDH
  const x448Shared = x448.getSharedSecret(
    assertHex(ourX448Private, "ourX448Private"),
    assertHex(theirX448Ephemeral, "theirX448Ephemeral"),
  );

  // ML-KEM-1024 decapsulate
  const mlKemShared = ml_kem1024.decapsulate(
    assertHex(mlKemCiphertext, "mlKemCiphertext"),
    assertHex(ourMlKemSecret, "ourMlKemSecret"),
  );

  // Same HKDF derivation
  const combined = new Uint8Array(x448Shared.length + mlKemShared.length);
  combined.set(x448Shared);
  combined.set(mlKemShared, x448Shared.length);
  const derivedSecret = hkdf(
    sha256,
    combined,
    undefined,
    "x448-ml-kem-1024-hybrid",
    32,
  );

  return {
    sharedSecret: Buffer.from(derivedSecret).toString("hex"),
    algorithm: "x448-ml-kem-1024",
  };
}
