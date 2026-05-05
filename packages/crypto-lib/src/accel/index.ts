/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Acceleration layer barrel export.
 *
 * Provides WebCrypto hardware acceleration and worker thread offloading
 * for CPU-intensive cryptographic operations.
 */

export {
  isWebCryptoAvailable,
  webCryptoAesGcmEncrypt,
  webCryptoAesGcmDecrypt,
  webCryptoHash,
} from "./webcrypto-bridge";
export type {
  WebCryptoHashAlgorithm,
  WebCryptoAesGcmEncryptOptions,
  WebCryptoAesGcmEncryptResult,
  WebCryptoAesGcmDecryptOptions,
  WebCryptoAesGcmDecryptResult,
  WebCryptoHashOptions,
  WebCryptoHashResult,
} from "./webcrypto-bridge";

export { WorkerPool } from "./worker-pool";
export type { WorkerPoolOptions, WorkerTask } from "./worker-pool";
