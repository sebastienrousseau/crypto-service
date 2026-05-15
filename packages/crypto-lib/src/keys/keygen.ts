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

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

function generateKid(publicKey: Uint8Array): string {
  const digest = sha256(publicKey);
  return bytesToBase64url(digest.subarray(0, 16));
}

// --- Key generation ---

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
  let publicKey: Uint8Array;
  let privateKey: Uint8Array;

  switch (algorithm) {
    case "ed25519": {
      const priv = ed25519.utils.randomSecretKey();
      const pub = ed25519.getPublicKey(priv);
      privateKey = priv;
      publicKey = pub;
      break;
    }
    case "x25519": {
      const priv = randomBytes(32);
      const pub = x25519.getPublicKey(priv);
      privateKey = priv;
      publicKey = pub;
      break;
    }
    case "ed448": {
      const priv = ed448.utils.randomSecretKey();
      const pub = ed448.getPublicKey(priv);
      privateKey = priv;
      publicKey = pub;
      break;
    }
    case "x448": {
      const priv = randomBytes(56);
      const pub = x448.getPublicKey(priv);
      privateKey = priv;
      publicKey = pub;
      break;
    }
    case "p256": {
      const priv = p256.utils.randomSecretKey();
      const pub = p256.getPublicKey(priv);
      privateKey = priv;
      publicKey = pub;
      break;
    }
    case "p384": {
      const priv = p384.utils.randomSecretKey();
      const pub = p384.getPublicKey(priv);
      privateKey = priv;
      publicKey = pub;
      break;
    }
    case "ml-kem-512": {
      const kp = ml_kem512.keygen();
      publicKey = kp.publicKey;
      privateKey = kp.secretKey;
      break;
    }
    case "ml-kem-768": {
      const kp = ml_kem768.keygen();
      publicKey = kp.publicKey;
      privateKey = kp.secretKey;
      break;
    }
    case "ml-kem-1024": {
      const kp = ml_kem1024.keygen();
      publicKey = kp.publicKey;
      privateKey = kp.secretKey;
      break;
    }
    case "ml-dsa-44": {
      const kp = ml_dsa44.keygen();
      publicKey = kp.publicKey;
      privateKey = kp.secretKey;
      break;
    }
    case "ml-dsa-65": {
      const kp = ml_dsa65.keygen();
      publicKey = kp.publicKey;
      privateKey = kp.secretKey;
      break;
    }
    case "ml-dsa-87": {
      const kp = ml_dsa87.keygen();
      publicKey = kp.publicKey;
      privateKey = kp.secretKey;
      break;
    }
    default:
      throw new Error(
        `Unsupported algorithm: ${algorithm}. Supported: ${KEY_ALGORITHMS.join(", ")}`,
      );
  }

  const kid = metadata.kid ?? generateKid(publicKey);

  return {
    publicKey: toHex(publicKey),
    privateKey: toHex(privateKey),
    algorithm,
    kid,
    metadata: { ...metadata, kid },
  };
}
