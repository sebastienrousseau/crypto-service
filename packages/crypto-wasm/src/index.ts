// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks WebAssembly performance accelerator for crypto-lib.
 *
 * Near-native speed for SHA-256, AES-GCM, Argon2, Ed25519, and X25519.
 *
 * @example
 * ```ts
 * import { WasmAccelerator, isWasmSupported } from '@sebastienrousseau/crypto-wasm';
 *
 * if (isWasmSupported()) {
 *   const accel = new WasmAccelerator();
 *   await accel.init();
 *   console.log(accel.status());
 * }
 * ```
 */

export { WasmAccelerator } from "./accelerator";
export {
  detectCapabilities,
  isSimdSupported,
  isStreamingSupported,
  isWasmSupported,
} from "./detect";
/** Re-exported types from the types module. */
export type {
  AcceleratedOperation,
  BenchmarkResult,
  WasmStatus,
} from "./types";
