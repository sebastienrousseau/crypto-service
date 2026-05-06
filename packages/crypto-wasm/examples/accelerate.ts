// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Basic WASM acceleration example.
 *
 * Run: `npx ts-node examples/accelerate.ts`
 */

import { WasmAccelerator } from "../src";

async function main() {
  console.log("\n=== crypto-wasm — accelerate ===\n");

  const accel = new WasmAccelerator();
  await accel.init();

  // Hash some data (falls back to JS if WASM not compiled yet)
  const data = new TextEncoder().encode("Hello, WebAssembly!");
  const digest = await accel.hash("sha256", data);
  console.log("SHA-256:", Buffer.from(digest).toString("hex"));

  const digest512 = await accel.hash("sha512", data);
  console.log("SHA-512:", Buffer.from(digest512).toString("hex"));

  console.log("\nAccelerator status:", accel.status());
  console.log("\nDone.");
}

main().catch(console.error);
