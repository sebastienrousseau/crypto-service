// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Operations that can be accelerated by WASM.
 *
 * @example
 * ```ts
 * import type { AcceleratedOperation } from "@sebastienrousseau/crypto-wasm";
 *
 * const op: AcceleratedOperation = "hash-sha256";
 * ```
 */
export type AcceleratedOperation =
  | "hash-sha256"
  | "hash-sha512"
  | "hash-blake3"
  | "aes-gcm-encrypt"
  | "aes-gcm-decrypt"
  | "argon2-hash"
  | "ed25519-sign"
  | "ed25519-verify"
  | "x25519-exchange"
  | "ml-kem-encapsulate"
  | "ml-kem-decapsulate"
  | "ml-dsa-sign"
  | "ml-dsa-verify";

/**
 * Performance comparison between JS and WASM implementations.
 *
 * @example
 * ```ts
 * import type { BenchmarkResult } from "@sebastienrousseau/crypto-wasm";
 *
 * const result: BenchmarkResult = {
 *   operation: "hash-sha256",
 *   jsTimeMs: 120,
 *   wasmTimeMs: 45,
 *   speedup: 2.67,
 * };
 * ```
 */
export interface BenchmarkResult {
  /** The accelerated operation being benchmarked. */
  operation: AcceleratedOperation;
  /** Execution time of the pure-JS implementation in milliseconds. */
  jsTimeMs: number;
  /** Execution time of the WASM implementation in milliseconds. */
  wasmTimeMs: number;
  /** Ratio of JS time to WASM time (values above 1 mean WASM is faster). */
  speedup: number;
}

/**
 * WASM module initialization status.
 *
 * @example
 * ```ts
 * import { WasmAccelerator } from "@sebastienrousseau/crypto-wasm";
 * import type { WasmStatus } from "@sebastienrousseau/crypto-wasm";
 *
 * const accel = new WasmAccelerator();
 * await accel.init();
 * const status: WasmStatus = accel.status();
 * console.log(status.version); // installed package version, or null
 * ```
 */
export interface WasmStatus {
  /** Whether WASM is available in the current runtime. */
  available: boolean;
  /** Semantic version of the loaded WASM module, or `null` if unavailable. */
  version: string | null;
  /** List of operations the WASM module can accelerate. */
  operations: AcceleratedOperation[];
  /** Current WASM linear memory usage in bytes. */
  memoryUsageBytes: number;
}
