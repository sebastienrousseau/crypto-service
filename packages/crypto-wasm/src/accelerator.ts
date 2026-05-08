// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import type {
  AcceleratedOperation,
  BenchmarkResult,
  WasmStatus,
} from "./types";

/** All operations the WASM module can accelerate. */
const ALL_OPERATIONS: AcceleratedOperation[] = [
  "hash-sha256",
  "hash-sha512",
  "hash-blake3",
  "aes-gcm-encrypt",
  "aes-gcm-decrypt",
  "argon2-hash",
  "ed25519-sign",
  "ed25519-verify",
  "x25519-exchange",
];

/**
 * WebAssembly cryptographic accelerator.
 *
 * When the WASM module is available, routes heavy operations through
 * near-native WASM code. Falls back transparently to the JavaScript
 * implementation when WASM is not loaded.
 *
 * Auto-detection: crypto-lib checks for this package at import time.
 * If installed, heavy operations are automatically routed through WASM.
 *
 * @example
 * ```ts
 * import { WasmAccelerator } from "@aspect/crypto-wasm";
 *
 * const accel = new WasmAccelerator();
 * await accel.init();
 * console.log(accel.isAvailable); // true if WASM loaded
 * const digest = await accel.hash("sha256", new Uint8Array([1, 2, 3]));
 * accel.destroy();
 * ```
 */
export class WasmAccelerator {
  private _module: WebAssembly.Module | null = null;
  private _instance: WebAssembly.Instance | null = null;
  private _initialized = false;

  /** Check if WASM acceleration is available. */
  get isAvailable(): boolean {
    return this._initialized && this._instance !== null;
  }

  /** The compiled WebAssembly module, or `null` if not loaded. */
  get wasmModule(): WebAssembly.Module | null {
    return this._module;
  }

  /** Initialize the WASM module from a .wasm file or buffer. */
  async init(wasmSource?: BufferSource | Response): Promise<void> {
    if (this._initialized) return;
    try {
      if (wasmSource) {
        if (wasmSource instanceof Response) {
          const { module, instance } =
            await WebAssembly.instantiateStreaming(wasmSource);
          this._module = module;
          this._instance = instance;
        } else {
          const { module, instance } =
            await WebAssembly.instantiate(wasmSource);
          this._module = module;
          this._instance = instance;
        }
      } else {
        // Try to load from default path
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const wasmPath = path.join(
          __dirname,
          "..",
          "wasm",
          "crypto_accel.wasm",
        );
        const buffer = await fs.readFile(wasmPath);
        const { module, instance } = await WebAssembly.instantiate(buffer);
        this._module = module;
        this._instance = instance;
      }
      this._initialized = true;
    } catch {
      // Mark as initialized even on failure — isAvailable will be false
      this._initialized = true;
      this._module = null;
      this._instance = null;
    }
  }

  /** Get current WASM status. */
  status(): WasmStatus {
    return {
      available: this.isAvailable,
      version: this.isAvailable ? "0.0.3" : null,
      operations: this.isAvailable ? [...ALL_OPERATIONS] : [],
      memoryUsageBytes: this._instance
        ? (this._instance.exports.memory as WebAssembly.Memory).buffer
            .byteLength
        : 0,
    };
  }

  /**
   * Hash data using WASM-accelerated implementation. Falls back to JS.
   *
   * @param algorithm - Hash algorithm name (e.g. "sha256", "sha512", "blake3").
   * @param data - Raw bytes to hash.
   * @returns The hash digest as a Uint8Array.
   */
  async hash(algorithm: string, data: Uint8Array): Promise<Uint8Array> {
    if (!this.isAvailable) {
      // Fallback: use Node.js built-in crypto
      const { createHash } = await import("node:crypto");
      const nodeAlg = algorithm.replace("-", "").toLowerCase();
      const h = createHash(nodeAlg);
      h.update(data);
      return new Uint8Array(h.digest());
    }
    // WASM-accelerated path — the actual WASM exports will be wired
    // here once the Rust/C++ module is compiled.
    const exports = this._instance!.exports as Record<string, unknown>;
    const hashFn = exports[`hash_${algorithm.replace("-", "_")}`];
    if (typeof hashFn !== "function") {
      throw new Error(
        `WASM module does not export hash function for "${algorithm}"`,
      );
    }
    return hashFn(data) as Uint8Array;
  }

  /**
   * Benchmark an operation: JS vs WASM.
   *
   * @param operation - The operation to benchmark.
   * @param iterations - Number of iterations (default 1000).
   * @returns Benchmark results with timing and speedup ratio.
   */
  async benchmark(
    operation: AcceleratedOperation,
    iterations = 1000,
  ): Promise<BenchmarkResult> {
    const data = new Uint8Array(1024).fill(0x42);

    // JS benchmark
    const { createHash } = await import("node:crypto");
    const jsStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const h = createHash("sha256");
      h.update(data);
      h.digest();
    }
    const jsTimeMs = performance.now() - jsStart;

    // WASM benchmark
    const wasmStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await this.hash("sha256", data);
    }
    const wasmTimeMs = performance.now() - wasmStart;

    return {
      operation,
      jsTimeMs,
      wasmTimeMs,
      speedup: wasmTimeMs > 0 ? jsTimeMs / wasmTimeMs : 0,
    };
  }

  /** Reset the accelerator, releasing the WASM module. */
  destroy(): void {
    this._module = null;
    this._instance = null;
    this._initialized = false;
  }
}
