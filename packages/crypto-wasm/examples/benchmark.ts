// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Compare JS vs WASM cryptographic performance.
 *
 * Runs the built-in benchmark for SHA-256 hashing and reports
 * execution times and speedup. Without the compiled WASM module,
 * both paths use the JS fallback and speedup is approximately 1.0x.
 *
 * Run: `npx ts-node examples/benchmark.ts`
 */

import { header, task, taskWithOutput, summary } from "./support";
import { WasmAccelerator } from "../src";

async function main() {
  header("crypto-wasm -- benchmark");

  const accel = new WasmAccelerator();

  await task("Initialise WasmAccelerator", async () => {
    await accel.init();
  });

  await taskWithOutput("Benchmark SHA-256 (5 000 iterations)", async () => {
    const result = await accel.benchmark("hash-sha256", 5000);
    return [
      `Operation: ${result.operation}`,
      `JS time:   ${result.jsTimeMs.toFixed(2)} ms`,
      `WASM time: ${result.wasmTimeMs.toFixed(2)} ms`,
      `Speedup:   ${result.speedup.toFixed(2)}x`,
    ];
  });

  await task("Report WASM availability", () => {
    if (!accel.isAvailable) {
      // Not a failure -- JS fallback is expected without compiled WASM
    }
  });

  summary(3);
}

main();
