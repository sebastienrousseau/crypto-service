/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Acceleration layer barrel export.
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

export {
  detectWasmBackend,
  wasmHash,
  wasmAeadEncrypt,
  wasmAeadDecrypt,
  _resetWasmDetection,
} from "./wasm-bridge";
export type {
  WasmBackend,
  WasmHashAlgorithm,
  WasmHashOptions,
  WasmHashResult,
  WasmAeadEncryptOptions,
  WasmAeadEncryptResult,
  WasmAeadDecryptResult,
} from "./wasm-bridge";

export {
  hasNativePqc,
  resetNativePqcCache,
  _forceNativePqcDetected,
  pqcBackend,
  bridgedMlKemKeygen,
  bridgedMlKemEncapsulate,
  bridgedMlKemDecapsulate,
} from "./native-pqc-bridge";
export type {
  PqcBackend,
  NativeMlKemLevel,
  BridgedMlKemKeygenResult,
  BridgedMlKemEncapsulateResult,
} from "./native-pqc-bridge";
