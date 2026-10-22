// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import type {
  AcceleratedOperation,
  BenchmarkResult,
  WasmStatus,
} from "./types";
import { VERSION } from "./version";
import type { HashAlgorithm } from "@sebastienrousseau/crypto-lib/modern";

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
  "ml-kem-encapsulate",
  "ml-kem-decapsulate",
  "ml-dsa-sign",
  "ml-dsa-verify",
];

/** The crypto-lib hash each benchmarkable operation runs. */
const BENCHMARK_HASHES: Partial<
  Record<AcceleratedOperation, "sha256" | "sha512" | "blake3">
> = {
  "hash-sha256": "sha256",
  "hash-sha512": "sha512",
  "hash-blake3": "blake3",
};

/** crypto-lib's name for a hash: `SHA-256` and `sha-512` lose the dash. */
function libHashName(algorithm: string): HashAlgorithm {
  const name = algorithm.toLowerCase();
  return (
    /^sha-\d+$/.test(name) ? name.replace("-", "") : name
  ) as HashAlgorithm;
}

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
 * import { WasmAccelerator } from "@sebastienrousseau/crypto-wasm";
 *
 * const accel = new WasmAccelerator();
 * await accel.init();
 * console.log(accel.isAvailable); // true if WASM loaded
 * const digest = await accel.hash("sha256", new Uint8Array([1, 2, 3]));
 * accel.destroy();
 * ```
 */
export class WasmAccelerator {
  /** The compiled WebAssembly module, or `null` if not yet loaded. */
  private _module: WebAssembly.Module | null = null;
  /** The instantiated WebAssembly instance, or `null` if not yet loaded. */
  private _instance: WebAssembly.Instance | null = null;
  /** Whether initialization has been attempted. */
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
      version: this.isAvailable ? VERSION : null,
      operations: this.isAvailable ? [...ALL_OPERATIONS] : [],
      memoryUsageBytes: this._instance
        ? (this._instance.exports.memory as WebAssembly.Memory).buffer
            .byteLength
        : 0,
    };
  }

  /**
   * Hash data with the WebAssembly module when one is loaded, otherwise
   * with crypto-lib.
   *
   * @param algorithm - A crypto-lib hash name (`"sha256"`, `"sha384"`,
   *   `"sha512"`, `"sha3-256"`, `"sha3-512"`, `"blake2b"`, `"blake3"`);
   *   `"SHA-256"` and `"sha-512"` are read as `"sha256"` and `"sha512"`.
   * @param data - Raw bytes to hash.
   * @returns The hash digest as a Uint8Array.
   * @throws For an algorithm crypto-lib does not support.
   */
  async hash(algorithm: string, data: Uint8Array): Promise<Uint8Array> {
    if (!this.isAvailable) {
      const { hash } = await import("@sebastienrousseau/crypto-lib/modern");
      const { digest } = hash({
        algorithm: libHashName(algorithm),
        data,
      });
      return new Uint8Array(Buffer.from(digest, "hex"));
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
   * ML-KEM-768 post-quantum key encapsulation.
   *
   * Routes to WebAssembly implementation when available; falls back transparently
   * to pure-JS implementation.
   */
  async mlKemEncapsulate(
    publicKey: Uint8Array,
  ): Promise<{ ciphertext: Uint8Array; sharedSecret: Uint8Array }> {
    if (!this.isAvailable) {
      const { mlKemEncapsulate } =
        await import("@sebastienrousseau/crypto-lib/modern");
      const hexKey = Buffer.from(publicKey).toString("hex");
      const res = mlKemEncapsulate(hexKey);
      return {
        ciphertext: new Uint8Array(Buffer.from(res.ciphertext, "hex")),
        sharedSecret: new Uint8Array(Buffer.from(res.sharedSecret, "hex")),
      };
    }
    const exports = this._instance!.exports as Record<string, unknown>;
    const fn = exports["ml_kem_encapsulate"];
    if (typeof fn !== "function") {
      throw new Error('WASM module does not export "ml_kem_encapsulate"');
    }
    return fn(publicKey) as {
      ciphertext: Uint8Array;
      sharedSecret: Uint8Array;
    };
  }

  /**
   * ML-KEM-768 post-quantum key decapsulation.
   *
   * Routes to WebAssembly implementation when available; falls back transparently
   * to pure-JS implementation.
   */
  async mlKemDecapsulate(
    secretKey: Uint8Array,
    ciphertext: Uint8Array,
  ): Promise<Uint8Array> {
    if (!this.isAvailable) {
      const { mlKemDecapsulate } =
        await import("@sebastienrousseau/crypto-lib/modern");
      const hexCt = Buffer.from(ciphertext).toString("hex");
      const hexSk = Buffer.from(secretKey).toString("hex");
      const res = mlKemDecapsulate(hexSk, hexCt);
      return new Uint8Array(Buffer.from(res.sharedSecret, "hex"));
    }
    const exports = this._instance!.exports as Record<string, unknown>;
    const fn = exports["ml_kem_decapsulate"];
    if (typeof fn !== "function") {
      throw new Error('WASM module does not export "ml_kem_decapsulate"');
    }
    return fn(secretKey, ciphertext) as Uint8Array;
  }

  /**
   * ML-DSA-65 post-quantum digital signature generation.
   *
   * Routes to WebAssembly implementation when available; falls back transparently
   * to pure-JS implementation.
   */
  async mlDsaSign(
    secretKey: Uint8Array,
    message: Uint8Array,
  ): Promise<Uint8Array> {
    if (!this.isAvailable) {
      const { mlDsaSign } =
        await import("@sebastienrousseau/crypto-lib/modern");
      const hexSk = Buffer.from(secretKey).toString("hex");
      const res = mlDsaSign(65, hexSk, message);
      return new Uint8Array(Buffer.from(res.signature, "hex"));
    }
    const exports = this._instance!.exports as Record<string, unknown>;
    const fn = exports["ml_dsa_sign"];
    if (typeof fn !== "function") {
      throw new Error('WASM module does not export "ml_dsa_sign"');
    }
    return fn(secretKey, message) as Uint8Array;
  }

  /**
   * ML-DSA-65 post-quantum digital signature verification.
   *
   * Routes to WebAssembly implementation when available; falls back transparently
   * to pure-JS implementation.
   */
  async mlDsaVerify(
    publicKey: Uint8Array,
    message: Uint8Array,
    signature: Uint8Array,
  ): Promise<boolean> {
    if (!this.isAvailable) {
      const { mlDsaVerify } =
        await import("@sebastienrousseau/crypto-lib/modern");
      const hexSig = Buffer.from(signature).toString("hex");
      const hexPk = Buffer.from(publicKey).toString("hex");
      return mlDsaVerify(65, hexPk, message, hexSig).valid;
    }
    const exports = this._instance!.exports as Record<string, unknown>;
    const fn = exports["ml_dsa_verify"];
    if (typeof fn !== "function") {
      throw new Error('WASM module does not export "ml_dsa_verify"');
    }
    return fn(publicKey, message, signature) as boolean;
  }

  /**
   * Benchmark a hash operation: crypto-lib against this accelerator's
   * {@link WasmAccelerator.hash}, which is crypto-lib too until a
   * WebAssembly module is loaded.
   *
   * @param operation - `"hash-sha256"`, `"hash-sha512"` or `"hash-blake3"`.
   * @param iterations - Number of iterations (default 1000).
   * @returns Benchmark results with timing and speedup ratio.
   * @throws For any other operation, which this method cannot time.
   */
  async benchmark(
    operation: AcceleratedOperation,
    iterations = 1000,
  ): Promise<BenchmarkResult> {
    const algorithm = BENCHMARK_HASHES[operation];
    if (algorithm === undefined) {
      throw new Error(
        `benchmark supports hash-sha256, hash-sha512 and hash-blake3, not ${operation}`,
      );
    }
    const data = new Uint8Array(1024).fill(0x42);
    const { hash } = await import("@sebastienrousseau/crypto-lib/modern");

    const jsStart = performance.now();
    for (let i = 0; i < iterations; i++) hash({ algorithm, data });
    const jsTimeMs = performance.now() - jsStart;

    const wasmStart = performance.now();
    for (let i = 0; i < iterations; i++) await this.hash(algorithm, data);
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
