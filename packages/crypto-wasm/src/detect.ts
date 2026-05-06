// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Runtime detection utilities for WebAssembly support.
 */

/**
 * Check if WebAssembly is supported in the current environment.
 *
 * @returns `true` when `WebAssembly` global is available and functional.
 */
export function isWasmSupported(): boolean {
  try {
    if (
      typeof WebAssembly === "object" &&
      typeof WebAssembly.instantiate === "function"
    ) {
      // Validate with a minimal WASM module (empty module)
      const minimal = new Uint8Array([
        0x00,
        0x61,
        0x73,
        0x6d, // magic   (\0asm)
        0x01,
        0x00,
        0x00,
        0x00, // version (1)
      ]);
      const mod = new WebAssembly.Module(minimal);
      return mod instanceof WebAssembly.Module;
    }
  } catch {
    // WebAssembly not available
  }
  return false;
}

/**
 * Check if WASM streaming compilation is supported.
 *
 * Streaming compilation (`WebAssembly.instantiateStreaming`) allows the
 * browser/runtime to compile WASM while downloading, giving a faster
 * startup for large modules.
 *
 * @returns `true` when streaming instantiation is available.
 */
export function isStreamingSupported(): boolean {
  return (
    typeof WebAssembly === "object" &&
    typeof WebAssembly.instantiateStreaming === "function"
  );
}

/**
 * Check if WASM SIMD is supported (V128 operations).
 *
 * SIMD enables vectorised crypto operations for additional speedup.
 * Detection uses a minimal WASM module that includes a V128 instruction.
 *
 * @returns `true` when SIMD is available.
 */
export function isSimdSupported(): boolean {
  try {
    // Minimal WASM module with a V128 const instruction
    const simd = new Uint8Array([
      0x00,
      0x61,
      0x73,
      0x6d, // magic
      0x01,
      0x00,
      0x00,
      0x00, // version 1
      0x01,
      0x05,
      0x01,
      0x60,
      0x00,
      0x01,
      0x7b, // type: () -> v128
      0x03,
      0x02,
      0x01,
      0x00, // function section
      0x0a,
      0x16,
      0x01,
      0x14, // code section
      0x00, // local count
      0xfd,
      0x0c, // v128.const
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x0b, // end
    ]);
    return new WebAssembly.Module(simd) instanceof WebAssembly.Module;
  } catch {
    return false;
  }
}

/**
 * Return a summary of WASM capabilities in the current runtime.
 */
export function detectCapabilities(): {
  wasmSupported: boolean;
  streamingSupported: boolean;
  simdSupported: boolean;
} {
  return {
    wasmSupported: isWasmSupported(),
    streamingSupported: isStreamingSupported(),
    simdSupported: isSimdSupported(),
  };
}
