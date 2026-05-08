/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Barrel exports for the `@sebastienrousseau/crypto-edge` package.
 *
 * Edge and serverless runtime adapter for crypto-lib -- runs on
 * Cloudflare Workers, Vercel Edge, Deno, Bun, and browsers.
 *
 * @example
 * ```ts
 * import {
 *   detectRuntime,
 *   getCapabilities,
 *   hash,
 *   encrypt,
 *   decrypt,
 *   sign,
 *   verify,
 *   generateKey,
 *   installPolyfills,
 * } from "@sebastienrousseau/crypto-edge";
 * ```
 */

// Types
export type {
  EdgeRuntime,
  RuntimeCapabilities,
  EdgeHashAlgorithm,
  EdgeKeyAlgorithm,
  EdgeSignAlgorithm,
  EdgeEncryptOptions,
  EdgeEncryptResult,
  EdgeDecryptOptions,
  EdgeHmacSignOptions,
  EdgeHmacVerifyOptions,
  EdgeGenerateKeyOptions,
} from "./types";

// Runtime detection
export {
  detectRuntime,
  getCapabilities,
  isEdgeCryptoAvailable,
} from "./detect";

// Web Crypto API wrapper
export {
  hash,
  encrypt,
  decrypt,
  sign,
  verify,
  generateKey,
  toHex,
  toBytes,
  randomBytes,
  concat,
} from "./webcrypto";

// Polyfills
export {
  installPolyfills,
  TextEncoderPolyfill,
  TextDecoderPolyfill,
  btoaPolyfill,
  atobPolyfill,
  insecureGetRandomValues,
  _resetPolyfillState,
} from "./polyfill";
