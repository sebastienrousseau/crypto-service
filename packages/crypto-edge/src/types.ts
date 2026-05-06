/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Runtime detection types for edge and serverless environments.
 *
 * Defines the set of recognised JavaScript runtimes and the capability
 * matrix that {@link getCapabilities} returns.
 */

/**
 * Recognised JavaScript runtime environments.
 *
 * - `"cloudflare-workers"` -- Cloudflare Workers / workerd
 * - `"vercel-edge"` -- Vercel Edge Runtime
 * - `"deno"` -- Deno
 * - `"bun"` -- Bun
 * - `"browser"` -- Standard web browser
 * - `"node"` -- Node.js
 * - `"unknown"` -- Unrecognised runtime
 */
export type EdgeRuntime =
  | "cloudflare-workers"
  | "vercel-edge"
  | "deno"
  | "bun"
  | "browser"
  | "node"
  | "unknown";

/**
 * Describes the cryptographic and encoding APIs available in the
 * current runtime.
 */
export interface RuntimeCapabilities {
  /** Detected runtime environment. */
  runtime: EdgeRuntime;
  /** Whether the global `crypto` object exists. */
  hasWebCrypto: boolean;
  /** Whether `crypto.subtle` is available (required for most operations). */
  hasSubtle: boolean;
  /** Whether the Node.js `node:crypto` module is available. */
  hasNodeCrypto: boolean;
  /** Whether `TextEncoder` / `TextDecoder` are available. */
  hasTextEncoder: boolean;
}

/** Supported hash algorithms for the edge Web Crypto wrapper. */
export type EdgeHashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

/** Supported symmetric encryption algorithms for key generation. */
export type EdgeKeyAlgorithm = "AES-GCM" | "AES-CBC" | "AES-CTR";

/** Supported signing algorithms for the edge Web Crypto wrapper. */
export type EdgeSignAlgorithm = "HMAC" | "ECDSA" | "RSASSA-PKCS1-v1_5";

/** Options for edge-compatible AES-GCM encryption. */
export interface EdgeEncryptOptions {
  /** Raw AES key bytes. */
  key: Uint8Array;
  /** Plaintext to encrypt. */
  plaintext: Uint8Array;
  /** Optional additional authenticated data. */
  aad?: Uint8Array;
}

/** Result of edge-compatible AES-GCM encryption. */
export interface EdgeEncryptResult {
  /** IV prepended to ciphertext (iv || ciphertext). */
  ciphertext: Uint8Array;
  /** Length of the IV prefix. */
  ivLength: number;
}

/** Options for edge-compatible AES-GCM decryption. */
export interface EdgeDecryptOptions {
  /** Raw AES key bytes. */
  key: Uint8Array;
  /** Ciphertext as returned by encrypt (iv || ciphertext). */
  ciphertext: Uint8Array;
  /** Length of the IV prefix (defaults to 12). */
  ivLength?: number;
  /** Optional additional authenticated data. */
  aad?: Uint8Array;
}

/** Options for HMAC signing. */
export interface EdgeHmacSignOptions {
  /** HMAC key bytes. */
  key: Uint8Array;
  /** Data to sign. */
  data: Uint8Array;
  /** Hash algorithm (defaults to SHA-256). */
  hash?: EdgeHashAlgorithm;
}

/** Options for HMAC verification. */
export interface EdgeHmacVerifyOptions extends EdgeHmacSignOptions {
  /** Signature to verify against. */
  signature: Uint8Array;
}

/** Options for key generation. */
export interface EdgeGenerateKeyOptions {
  /** Algorithm family. */
  algorithm: EdgeKeyAlgorithm;
  /** Key length in bits (128, 192, or 256). Defaults to 256. */
  length?: 128 | 192 | 256;
}
