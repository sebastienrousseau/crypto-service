/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Ed25519 digital signatures via @noble/curves.
 *
 * Ed25519 is the recommended signing algorithm for new applications:
 * - Small keys (32 bytes) and signatures (64 bytes)
 * - Fast (10K+ ops/sec in pure JS)
 * - Deterministic (no nonce-reuse vulnerability)
 * - Widely supported (SSH, TLS, DNSSEC, cryptocurrency)
 */

import { ed25519 } from "@noble/curves/ed25519";
import { randomBytes } from "@noble/ciphers/webcrypto";

/** Ed25519 key pair (32-byte private + 32-byte public). */
export interface Ed25519KeyPair {
  /** Hex-encoded 32-byte private key. */
  privateKey: string;
  /** Hex-encoded 32-byte public key. */
  publicKey: string;
}

/** Result of an Ed25519 signing operation. */
export interface SignResult {
  /** Hex-encoded 64-byte Ed25519 signature. */
  signature: string;
  /** Algorithm used. */
  algorithm: "ed25519";
}

/** Result of an Ed25519 signature verification. */
export interface VerifyResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Algorithm used. */
  algorithm: "ed25519";
}

/**
 * Generate a new Ed25519 key pair.
 */
export function generateEd25519KeyPair(): Ed25519KeyPair {
  const privateKey = randomBytes(32);
  const publicKey = ed25519.getPublicKey(privateKey);

  return {
    privateKey: Buffer.from(privateKey).toString("hex"),
    publicKey: Buffer.from(publicKey).toString("hex"),
  };
}

/**
 * Sign a message with Ed25519.
 */
export function ed25519Sign(
  privateKey: string | Uint8Array,
  message: string | Uint8Array,
): SignResult {
  const key =
    typeof privateKey === "string"
      ? Buffer.from(privateKey, "hex")
      : privateKey;
  const msg =
    typeof message === "string" ? Buffer.from(message, "utf8") : message;

  const signature = ed25519.sign(msg, key);

  return {
    signature: Buffer.from(signature).toString("hex"),
    algorithm: "ed25519",
  };
}

/**
 * Verify an Ed25519 signature.
 */
export function ed25519Verify(
  publicKey: string | Uint8Array,
  message: string | Uint8Array,
  signature: string | Uint8Array,
): VerifyResult {
  const key =
    typeof publicKey === "string" ? Buffer.from(publicKey, "hex") : publicKey;
  const msg =
    typeof message === "string" ? Buffer.from(message, "utf8") : message;
  const sig =
    typeof signature === "string" ? Buffer.from(signature, "hex") : signature;

  const valid = ed25519.verify(sig, msg, key);

  return { valid, algorithm: "ed25519" };
}
