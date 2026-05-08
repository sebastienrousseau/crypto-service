// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Check WASM availability and capabilities in the current runtime.
 *
 * Demonstrates the individual detection helpers and the combined
 * `detectCapabilities()` function.
 *
 * Run: `npx ts-node examples/detect.ts`
 */

import { header, task, taskWithOutput, summary } from "./support";
import {
  detectCapabilities,
  isWasmSupported,
  isStreamingSupported,
  isSimdSupported,
} from "../src";

async function main() {
  header("crypto-wasm -- detect");

  await taskWithOutput("Check individual WASM capabilities", () => {
    return [
      `WebAssembly supported: ${isWasmSupported()}`,
      `Streaming supported:   ${isStreamingSupported()}`,
      `SIMD supported:        ${isSimdSupported()}`,
    ];
  });

  await taskWithOutput("Detect all capabilities at once", () => {
    const caps = detectCapabilities();
    return [
      `wasmSupported:      ${caps.wasmSupported}`,
      `streamingSupported: ${caps.streamingSupported}`,
      `simdSupported:      ${caps.simdSupported}`,
    ];
  });

  await task("Verify detectCapabilities returns an object", () => {
    const caps = detectCapabilities();
    if (typeof caps.wasmSupported !== "boolean") {
      throw new Error("wasmSupported is not a boolean");
    }
  });

  summary(3);
}

main();
