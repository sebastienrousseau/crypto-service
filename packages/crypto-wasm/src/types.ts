// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/** Operations that can be accelerated by WASM. */
export type AcceleratedOperation =
  | "hash-sha256"
  | "hash-sha512"
  | "hash-blake3"
  | "aes-gcm-encrypt"
  | "aes-gcm-decrypt"
  | "argon2-hash"
  | "ed25519-sign"
  | "ed25519-verify"
  | "x25519-exchange";

/** Performance comparison between JS and WASM implementations. */
export interface BenchmarkResult {
  operation: AcceleratedOperation;
  jsTimeMs: number;
  wasmTimeMs: number;
  speedup: number;
}

/** WASM module initialization status. */
export interface WasmStatus {
  available: boolean;
  version: string | null;
  operations: AcceleratedOperation[];
  memoryUsageBytes: number;
}
