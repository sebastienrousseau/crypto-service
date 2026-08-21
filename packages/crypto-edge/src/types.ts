/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Runtime detection types for edge and serverless environments.
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
 *
 * @example
 * ```ts
 * import type { EdgeRuntime } from "@aspect/crypto-edge";
 *
 * const runtime: EdgeRuntime = "cloudflare-workers";
 * ```
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
 *
 * @example
 * ```ts
 * import type { RuntimeCapabilities } from "@aspect/crypto-edge";
 *
 * const caps: RuntimeCapabilities = {
 *   runtime: "node",
 *   hasWebCrypto: true,
 *   hasSubtle: true,
 *   hasNodeCrypto: true,
 *   hasTextEncoder: true,
 * };
 * ```
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

/**
 * Supported hash algorithms for the edge Web Crypto wrapper.
 *
 * @example
 * ```ts
 * import type { EdgeHashAlgorithm } from "@aspect/crypto-edge";
 *
 * const alg: EdgeHashAlgorithm = "SHA-256";
 * ```
 */
export type EdgeHashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

/**
 * Supported symmetric encryption algorithms for key generation.
 *
 * @example
 * ```ts
 * import type { EdgeKeyAlgorithm } from "@aspect/crypto-edge";
 *
 * const alg: EdgeKeyAlgorithm = "AES-GCM";
 * ```
 */
export type EdgeKeyAlgorithm = "AES-GCM" | "AES-CBC" | "AES-CTR";

/**
 * Supported signing algorithms for the edge Web Crypto wrapper.
 *
 * @example
 * ```ts
 * import type { EdgeSignAlgorithm } from "@aspect/crypto-edge";
 *
 * const alg: EdgeSignAlgorithm = "HMAC";
 * ```
 */
export type EdgeSignAlgorithm = "HMAC" | "ECDSA" | "RSASSA-PKCS1-v1_5";

/**
 * Options for edge-compatible AES-GCM encryption.
 *
 * @example
 * ```ts
 * import type { EdgeEncryptOptions } from "@aspect/crypto-edge";
 *
 * const opts: EdgeEncryptOptions = {
 *   key: new Uint8Array(32),
 *   plaintext: new TextEncoder().encode("hello"),
 * };
 * ```
 */
export interface EdgeEncryptOptions {
  /** Raw AES key bytes. */
  key: Uint8Array;
  /** Plaintext to encrypt. */
  plaintext: Uint8Array;
  /** Optional additional authenticated data. */
  aad?: Uint8Array;
}

/**
 * Result of edge-compatible AES-GCM encryption.
 *
 * @example
 * ```ts
 * import type { EdgeEncryptResult } from "@aspect/crypto-edge";
 *
 * const result: EdgeEncryptResult = {
 *   ciphertext: new Uint8Array(44), // iv || ciphertext || tag
 *   ivLength: 12,
 * };
 * ```
 */
export interface EdgeEncryptResult {
  /** IV prepended to ciphertext (iv || ciphertext). */
  ciphertext: Uint8Array;
  /** Length of the IV prefix. */
  ivLength: number;
}

/**
 * Options for edge-compatible AES-GCM decryption.
 *
 * @example
 * ```ts
 * import type { EdgeDecryptOptions } from "@aspect/crypto-edge";
 *
 * const opts: EdgeDecryptOptions = {
 *   key: new Uint8Array(32),
 *   ciphertext: encrypted.ciphertext,
 *   ivLength: 12,
 * };
 * ```
 */
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

/**
 * Options for HMAC signing.
 *
 * @example
 * ```ts
 * import type { EdgeHmacSignOptions } from "@aspect/crypto-edge";
 *
 * const opts: EdgeHmacSignOptions = {
 *   key: new Uint8Array(32),
 *   data: new TextEncoder().encode("message"),
 *   hash: "SHA-256",
 * };
 * ```
 */
export interface EdgeHmacSignOptions {
  /** HMAC key bytes. */
  key: Uint8Array;
  /** Data to sign. */
  data: Uint8Array;
  /** Hash algorithm (defaults to SHA-256). */
  hash?: EdgeHashAlgorithm;
}

/**
 * Options for HMAC verification.
 *
 * @example
 * ```ts
 * import type { EdgeHmacVerifyOptions } from "@aspect/crypto-edge";
 *
 * const opts: EdgeHmacVerifyOptions = {
 *   key: new Uint8Array(32),
 *   data: new TextEncoder().encode("message"),
 *   signature: hmacBytes,
 * };
 * ```
 */
export interface EdgeHmacVerifyOptions extends EdgeHmacSignOptions {
  /** Signature to verify against. */
  signature: Uint8Array;
}

/**
 * Options for key generation.
 *
 * @example
 * ```ts
 * import type { EdgeGenerateKeyOptions } from "@aspect/crypto-edge";
 *
 * const opts: EdgeGenerateKeyOptions = {
 *   algorithm: "AES-GCM",
 *   length: 256,
 * };
 * ```
 */
export interface EdgeGenerateKeyOptions {
  /** Algorithm family. */
  algorithm: EdgeKeyAlgorithm;
  /** Key length in bits (128, 192, or 256). Defaults to 256. */
  length?: 128 | 192 | 256;
}
