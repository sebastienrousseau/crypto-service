/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Post-Quantum Cryptography — ML-KEM (Kyber) + hybrid key exchange.
 *
 * Implements NIST FIPS 203 ML-KEM-768 for quantum-resistant key encapsulation,
 * and a hybrid scheme combining X25519 (classical) + ML-KEM-768 (post-quantum).
 *
 * The hybrid approach ensures security even if one algorithm is broken:
 * - If quantum computers arrive: X25519 fails but ML-KEM protects
 * - If ML-KEM has a flaw: X25519 still provides classical security
 *
 * Shared secret derivation: HKDF-SHA256(X25519_shared || ML-KEM_shared, salt, info)
 */

import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/ciphers/utils.js";

// --- ML-KEM (Kyber) standalone ---

/** ML-KEM-768 key pair (encapsulation + decapsulation keys). */
export interface MlKemKeyPair {
  /** Hex-encoded public (encapsulation) key. */
  publicKey: string;
  /** Hex-encoded secret (decapsulation) key. */
  secretKey: string;
  /** Algorithm identifier. */
  algorithm: "ml-kem-768";
}

/** Result of an ML-KEM-768 encapsulation operation. */
export interface MlKemEncapsulateResult {
  /** Hex-encoded ciphertext to send to the secret key holder. */
  ciphertext: string;
  /** Hex-encoded 32-byte shared secret (only known to encapsulator until decapsulation). */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: "ml-kem-768";
}

/** Result of an ML-KEM-768 decapsulation operation. */
export interface MlKemDecapsulateResult {
  /** Hex-encoded 32-byte shared secret. */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: "ml-kem-768";
}

/**
 * Generate an ML-KEM-768 key pair.
 */
export function mlKemGenerateKeyPair(): MlKemKeyPair {
  const { publicKey, secretKey } = ml_kem768.keygen();
  return {
    publicKey: Buffer.from(publicKey).toString("hex"),
    secretKey: Buffer.from(secretKey).toString("hex"),
    algorithm: "ml-kem-768",
  };
}

/**
 * Encapsulate — generate a shared secret and ciphertext using the recipient's public key.
 */
export function mlKemEncapsulate(publicKeyHex: string): MlKemEncapsulateResult {
  const publicKey = Buffer.from(publicKeyHex, "hex");
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKey);
  return {
    ciphertext: Buffer.from(cipherText).toString("hex"),
    sharedSecret: Buffer.from(sharedSecret).toString("hex"),
    algorithm: "ml-kem-768",
  };
}

/**
 * Decapsulate — recover the shared secret using the secret key and ciphertext.
 */
export function mlKemDecapsulate(
  secretKeyHex: string,
  ciphertextHex: string,
): MlKemDecapsulateResult {
  const secretKey = Buffer.from(secretKeyHex, "hex");
  const cipherText = Buffer.from(ciphertextHex, "hex");
  const sharedSecret = ml_kem768.decapsulate(cipherText, secretKey);
  return {
    sharedSecret: Buffer.from(sharedSecret).toString("hex"),
    algorithm: "ml-kem-768",
  };
}

// --- Hybrid X25519 + ML-KEM-768 ---

/** X25519 + ML-KEM-768 hybrid key pair. */
export interface HybridKeyPair {
  /** X25519 private key (hex, 32 bytes). */
  x25519PrivateKey: string;
  /** X25519 public key (hex, 32 bytes). */
  x25519PublicKey: string;
  /** ML-KEM-768 public key (hex). */
  mlKemPublicKey: string;
  /** ML-KEM-768 secret key (hex). */
  mlKemSecretKey: string;
  /** Algorithm identifier. */
  algorithm: "x25519-ml-kem-768";
}

/** Result of an X25519 + ML-KEM-768 hybrid encapsulation. */
export interface HybridEncapsulateResult {
  /** X25519 ephemeral public key (hex, 32 bytes). */
  x25519EphemeralPublic: string;
  /** ML-KEM ciphertext (hex). */
  mlKemCiphertext: string;
  /** Hex-encoded 32-byte combined shared secret (HKDF of both). */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: "x25519-ml-kem-768";
}

/** Result of an X25519 + ML-KEM-768 hybrid decapsulation. */
export interface HybridDecapsulateResult {
  /** Hex-encoded 32-byte combined shared secret. */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: "x25519-ml-kem-768";
}

/**
 * Generate a hybrid X25519 + ML-KEM-768 key pair.
 */
export function hybridGenerateKeyPair(): HybridKeyPair {
  const x25519Priv = randomBytes(32);
  const x25519Pub = x25519.getPublicKey(x25519Priv);
  const { publicKey: mlKemPub, secretKey: mlKemSec } = ml_kem768.keygen();

  return {
    x25519PrivateKey: Buffer.from(x25519Priv).toString("hex"),
    x25519PublicKey: Buffer.from(x25519Pub).toString("hex"),
    mlKemPublicKey: Buffer.from(mlKemPub).toString("hex"),
    mlKemSecretKey: Buffer.from(mlKemSec).toString("hex"),
    algorithm: "x25519-ml-kem-768",
  };
}

/**
 * Hybrid encapsulate — performs X25519 ECDH + ML-KEM encapsulation,
 * then derives a combined shared secret via HKDF.
 *
 * @param theirX25519Public - Recipient's X25519 public key (hex).
 * @param theirMlKemPublic - Recipient's ML-KEM public key (hex).
 */
export function hybridEncapsulate(
  theirX25519Public: string,
  theirMlKemPublic: string,
): HybridEncapsulateResult {
  // X25519: generate ephemeral key pair and compute shared secret
  const ephemeralPriv = randomBytes(32);
  const ephemeralPub = x25519.getPublicKey(ephemeralPriv);
  const x25519Shared = x25519.getSharedSecret(
    ephemeralPriv,
    Buffer.from(theirX25519Public, "hex"),
  );

  // ML-KEM: encapsulate with their public key
  const { cipherText, sharedSecret: mlKemShared } = ml_kem768.encapsulate(
    Buffer.from(theirMlKemPublic, "hex"),
  );

  // Combine both shared secrets via HKDF-SHA256
  const combined = new Uint8Array(x25519Shared.length + mlKemShared.length);
  combined.set(x25519Shared);
  combined.set(mlKemShared, x25519Shared.length);

  const derivedSecret = hkdf(
    sha256,
    combined,
    undefined,
    new TextEncoder().encode("x25519-ml-kem-768-hybrid"),
    32,
  );

  return {
    x25519EphemeralPublic: Buffer.from(ephemeralPub).toString("hex"),
    mlKemCiphertext: Buffer.from(cipherText).toString("hex"),
    sharedSecret: Buffer.from(derivedSecret).toString("hex"),
    algorithm: "x25519-ml-kem-768",
  };
}

/**
 * Hybrid decapsulate — recovers the combined shared secret using our
 * private keys and the sender's ephemeral data.
 *
 * @param ourX25519Private - Our X25519 private key (hex).
 * @param ourMlKemSecret - Our ML-KEM secret key (hex).
 * @param theirX25519Ephemeral - Sender's ephemeral X25519 public key (hex).
 * @param mlKemCiphertext - ML-KEM ciphertext from the sender (hex).
 */
export function hybridDecapsulate(
  ourX25519Private: string,
  ourMlKemSecret: string,
  theirX25519Ephemeral: string,
  mlKemCiphertext: string,
): HybridDecapsulateResult {
  // X25519: compute shared secret
  const x25519Shared = x25519.getSharedSecret(
    Buffer.from(ourX25519Private, "hex"),
    Buffer.from(theirX25519Ephemeral, "hex"),
  );

  // ML-KEM: decapsulate
  const mlKemShared = ml_kem768.decapsulate(
    Buffer.from(mlKemCiphertext, "hex"),
    Buffer.from(ourMlKemSecret, "hex"),
  );

  // Combine via same HKDF derivation
  const combined = new Uint8Array(x25519Shared.length + mlKemShared.length);
  combined.set(x25519Shared);
  combined.set(mlKemShared, x25519Shared.length);

  const derivedSecret = hkdf(
    sha256,
    combined,
    undefined,
    new TextEncoder().encode("x25519-ml-kem-768-hybrid"),
    32,
  );

  return {
    sharedSecret: Buffer.from(derivedSecret).toString("hex"),
    algorithm: "x25519-ml-kem-768",
  };
}
