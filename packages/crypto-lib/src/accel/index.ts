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
/** Re-exported WebCrypto bridge option and result types. */
export type {
  WebCryptoHashAlgorithm,
  WebCryptoAesGcmEncryptOptions,
  WebCryptoAesGcmEncryptResult,
  WebCryptoAesGcmDecryptOptions,
  WebCryptoAesGcmDecryptResult,
  WebCryptoHashOptions,
  WebCryptoHashResult,
} from "./webcrypto-bridge";

export {
  WorkerPool,
  WorkerPoolBusyError,
  WorkerTaskTimeoutError,
} from "./worker-pool";
/** Re-exported worker pool option and task types. */
export type { WorkerPoolOptions, WorkerTask } from "./worker-pool";

export {
  detectWasmBackend,
  wasmHash,
  wasmAeadEncrypt,
  wasmAeadDecrypt,
} from "./wasm-bridge";
/** Re-exported WASM bridge option and result types. */
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
  pqcBackend,
  bridgedMlKemKeygen,
  bridgedMlKemEncapsulate,
  bridgedMlKemDecapsulate,
} from "./native-pqc-bridge";
/** Which post-quantum algorithms run in the runtime's OpenSSL. */
export { nativeAlgorithms } from "./pq-backend";
/** Re-exported native PQC bridge types. */
export type {
  PqcBackend,
  NativeMlKemLevel,
  BridgedMlKemKeygenResult,
  BridgedMlKemEncapsulateResult,
} from "./native-pqc-bridge";

export {
  detectModernWebCrypto,
  modernChaCha20Encrypt,
  modernChaCha20Decrypt,
  modernSha3Hash,
} from "./webcrypto-modern";
/** Re-exported modern WebCrypto option and result types. */
export type {
  WebCryptoModernSupport,
  ModernSha3Algorithm,
  ModernChaCha20EncryptOptions,
  ModernAeadResult,
  ModernChaCha20DecryptOptions,
  ModernChaCha20DecryptResult,
  ModernSha3HashOptions,
  ModernSha3HashResult,
} from "./webcrypto-modern";
