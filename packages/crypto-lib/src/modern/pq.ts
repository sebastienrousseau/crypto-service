/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks The pre-0.0.7 X25519 + ML-KEM-768 hybrid key exchange, kept so
 * existing callers work; new code uses `hybridKemKeygen`,
 * `hybridKemEncapsulate` and `hybridKemDecapsulate` (pq-kem.ts). ML-KEM
 * on its own is in pq-kem.ts.
 *
 * The hybrid approach ensures security even if one algorithm is broken:
 * - If quantum computers arrive: X25519 fails but ML-KEM protects
 * - If ML-KEM has a flaw: X25519 still provides classical security
 *
 * Shared secret derivation: HKDF-SHA256(X25519_shared || ML-KEM_shared, salt, info)
 */

import { ml_kem768 } from "../accel/pq-backend";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { decodeHex, toHex } from "../encoding";

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
 * @deprecated Use `hybridKemKeygen(768)` from the `pq-kem` module; the key
 *   fields are the same.
 */
export function hybridGenerateKeyPair(): HybridKeyPair {
  const x25519Priv = randomBytes(32);
  const x25519Pub = x25519.getPublicKey(x25519Priv);
  const { publicKey: mlKemPub, secretKey: mlKemSec } = ml_kem768.keygen();

  return {
    x25519PrivateKey: toHex(x25519Priv),
    x25519PublicKey: toHex(x25519Pub),
    mlKemPublicKey: toHex(mlKemPub),
    mlKemSecretKey: toHex(mlKemSec),
    algorithm: "x25519-ml-kem-768",
  };
}

/**
 * Hybrid encapsulate — performs X25519 ECDH + ML-KEM encapsulation,
 * then derives a combined shared secret via HKDF.
 *
 * @param theirX25519Public - Recipient's X25519 public key (hex).
 * @param theirMlKemPublic - Recipient's ML-KEM public key (hex).
 * @deprecated Uses the unbound pre-0.0.7 combiner, whose secrets do not
 *   match `hybridKemEncapsulate` (v2), which also binds the ciphertexts
 *   and public keys. Use `hybridKemEncapsulate(768, ...)`.
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
    decodeHex(theirX25519Public),
  );

  // ML-KEM: encapsulate with their public key
  const { cipherText, sharedSecret: mlKemShared } = ml_kem768.encapsulate(
    decodeHex(theirMlKemPublic),
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
    x25519EphemeralPublic: toHex(ephemeralPub),
    mlKemCiphertext: toHex(cipherText),
    sharedSecret: toHex(derivedSecret),
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
 * @deprecated Uses the unbound pre-0.0.7 combiner; use
 *   `hybridKemDecapsulate(768, ...)`.
 */
export function hybridDecapsulate(
  ourX25519Private: string,
  ourMlKemSecret: string,
  theirX25519Ephemeral: string,
  mlKemCiphertext: string,
): HybridDecapsulateResult {
  // X25519: compute shared secret
  const x25519Shared = x25519.getSharedSecret(
    decodeHex(ourX25519Private),
    decodeHex(theirX25519Ephemeral),
  );

  // ML-KEM: decapsulate
  const mlKemShared = ml_kem768.decapsulate(
    decodeHex(mlKemCiphertext),
    decodeHex(ourMlKemSecret),
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
    sharedSecret: toHex(derivedSecret),
    algorithm: "x25519-ml-kem-768",
  };
}
