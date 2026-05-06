// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Compare JS vs WASM cryptographic performance.
 *
 * Run: `npx ts-node examples/benchmark.ts`
 */

import { WasmAccelerator } from "../src";

async function main() {
  console.log("\n=== crypto-wasm — benchmark ===\n");

  const accel = new WasmAccelerator();
  await accel.init();

  const result = await accel.benchmark("hash-sha256", 5000);

  console.log(`Operation:  ${result.operation}`);
  console.log(`JS time:    ${result.jsTimeMs.toFixed(2)} ms`);
  console.log(`WASM time:  ${result.wasmTimeMs.toFixed(2)} ms`);
  console.log(`Speedup:    ${result.speedup.toFixed(2)}x`);

  if (!accel.isAvailable) {
    console.log(
      "\nNote: WASM module not loaded — both paths used JS fallback.",
    );
    console.log(
      "Build the Rust WASM module to see real acceleration numbers.",
    );
  }

  console.log("\nDone.");
}

main().catch(console.error);
