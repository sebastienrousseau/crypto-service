/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Unified key generation across all supported algorithms.
 *
 * Provides a single `generateKeyPair()` entry point that dispatches
 * to the correct primitive based on the requested algorithm.
 */

import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { ed448, x448 } from "@noble/curves/ed448.js";
import { p256, p384 } from "@noble/curves/nist.js";
import {
  ml_kem512,
  ml_kem768,
  ml_kem1024,
} from "@noble/post-quantum/ml-kem.js";
import { ml_dsa44, ml_dsa65, ml_dsa87 } from "@noble/post-quantum/ml-dsa.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToBase64url } from "./serialize";

// --- Types ---

/** List of all supported key-generation algorithm identifiers. */
export const KEY_ALGORITHMS = [
  "ed25519",
  "x25519",
  "ed448",
  "x448",
  "p256",
  "p384",
  "ml-kem-512",
  "ml-kem-768",
  "ml-kem-1024",
  "ml-dsa-44",
  "ml-dsa-65",
  "ml-dsa-87",
] as const;

/** Union type of all supported key-generation algorithm names. */
export type KeyAlgorithm = (typeof KEY_ALGORITHMS)[number];

/** Optional metadata attached to a generated key pair. */
export interface KeyMetadata {
  /** Key ID (auto-generated if not provided). */
  kid?: string | undefined;
  /** Key usage: "sig" (signing) or "enc" (encryption/key exchange). */
  use?: "sig" | "enc" | undefined;
  /** Expiration date (ISO 8601 string). */
  exp?: string | undefined;
}

/** Result of a key-pair generation operation. */
export interface GeneratedKeyPair {
  /** Hex-encoded public key. */
  publicKey: string;
  /** Hex-encoded private/secret key. */
  privateKey: string;
  /** Algorithm identifier. */
  algorithm: KeyAlgorithm;
  /** Key ID (SHA-256 thumbprint of public key). */
  kid: string;
  /** Key metadata. */
  metadata: KeyMetadata;
}

// --- Helpers ---

/** Convert bytes to a hex string. */
function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/** Generate a key ID from a SHA-256 thumbprint of the public key. */
function generateKid(publicKey: Uint8Array): string {
  const digest = sha256(publicKey);
  return bytesToBase64url(digest.subarray(0, 16));
}

// --- Key generation ---

type RawKeyPair = { publicKey: Uint8Array; privateKey: Uint8Array };

/** A raw key pair from a secret key and its public-key derivation. */
const fromSecret = (
  privateKey: Uint8Array,
  derive: (priv: Uint8Array) => Uint8Array,
): RawKeyPair => ({ publicKey: derive(privateKey), privateKey });

/** A raw key pair from a post-quantum `keygen()` result. */
const fromPq = (kp: {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}): RawKeyPair => ({ publicKey: kp.publicKey, privateKey: kp.secretKey });

/** Key generation per algorithm. */
const KEYGEN: Record<KeyAlgorithm, () => RawKeyPair> = {
  ed25519: () =>
    fromSecret(ed25519.utils.randomSecretKey(), ed25519.getPublicKey),
  x25519: () => fromSecret(randomBytes(32), x25519.getPublicKey),
  ed448: () => fromSecret(ed448.utils.randomSecretKey(), ed448.getPublicKey),
  x448: () => fromSecret(randomBytes(56), x448.getPublicKey),
  p256: () => fromSecret(p256.utils.randomSecretKey(), p256.getPublicKey),
  p384: () => fromSecret(p384.utils.randomSecretKey(), p384.getPublicKey),
  "ml-kem-512": () => fromPq(ml_kem512.keygen()),
  "ml-kem-768": () => fromPq(ml_kem768.keygen()),
  "ml-kem-1024": () => fromPq(ml_kem1024.keygen()),
  "ml-dsa-44": () => fromPq(ml_dsa44.keygen()),
  "ml-dsa-65": () => fromPq(ml_dsa65.keygen()),
  "ml-dsa-87": () => fromPq(ml_dsa87.keygen()),
};

/**
 * Generate a key pair for any supported algorithm.
 *
 * @param algorithm - The algorithm to generate keys for.
 * @param metadata  - Optional metadata (kid, use, exp).
 */
export function generateKeyPair(
  algorithm: KeyAlgorithm,
  metadata: KeyMetadata = {},
): GeneratedKeyPair {
  if (!Object.hasOwn(KEYGEN, algorithm)) {
    throw new Error(
      `Unsupported algorithm: ${algorithm}. Supported: ${KEY_ALGORITHMS.join(", ")}`,
    );
  }
  const { publicKey, privateKey } = KEYGEN[algorithm]();

  const kid = metadata.kid ?? generateKid(publicKey);

  return {
    publicKey: toHex(publicKey),
    privateKey: toHex(privateKey),
    algorithm,
    kid,
    metadata: { ...metadata, kid },
  };
}
