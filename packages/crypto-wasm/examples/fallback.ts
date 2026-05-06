// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Graceful fallback demo — shows that operations work even without WASM.
 *
 * Run: `npx ts-node examples/fallback.ts`
 */

import { WasmAccelerator, isWasmSupported } from "../src";

async function main() {
  console.log("\n=== crypto-wasm — fallback ===\n");

  console.log(`WASM supported in runtime: ${isWasmSupported()}`);

  const accel = new WasmAccelerator();

  // Intentionally do NOT call init() — simulates missing WASM module
  console.log(`Accelerator available: ${accel.isAvailable}`);
  console.log("Status:", accel.status());

  // Operations still work via JS fallback
  const data = new TextEncoder().encode("fallback test");
  const digest = await accel.hash("sha256", data);
  console.log("\nSHA-256 (JS fallback):", Buffer.from(digest).toString("hex"));

  // Now init (will fail gracefully since no .wasm file)
  await accel.init();
  console.log(`\nAfter init — available: ${accel.isAvailable}`);

  // Still works via fallback
  const digest2 = await accel.hash("sha256", data);
  console.log("SHA-256 (after init):", Buffer.from(digest2).toString("hex"));

  // Both digests should be identical
  const hex1 = Buffer.from(digest).toString("hex");
  const hex2 = Buffer.from(digest2).toString("hex");
  console.log(`\nDigests match: ${hex1 === hex2}`);

  console.log("\nDone.");
}

main().catch(console.error);
