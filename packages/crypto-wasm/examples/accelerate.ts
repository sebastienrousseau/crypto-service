// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Basic WASM acceleration for hashing.
 *
 * Initialises the WasmAccelerator and hashes data using SHA-256 and
 * SHA-512, falling back to the pure-JS implementation when the WASM
 * module is not compiled.
 *
 * Run: `npx ts-node examples/accelerate.ts`
 */

import { header, task, summary } from "./support";
import { WasmAccelerator } from "../src";

async function main() {
  header("crypto-wasm -- accelerate");

  const accel = new WasmAccelerator();

  await task("Initialise WasmAccelerator", async () => {
    await accel.init();
  });

  const data = new TextEncoder().encode("Hello, WebAssembly!");

  await task("Hash data with SHA-256", async () => {
    const digest = await accel.hash("sha256", data);
    if (digest.length === 0) throw new Error("Empty digest");
  });

  await task("Hash data with SHA-512", async () => {
    const digest = await accel.hash("sha512", data);
    if (digest.length === 0) throw new Error("Empty digest");
  });

  await task("Query accelerator status", () => {
    const status = accel.status();
    if (!status) throw new Error("No status returned");
  });

  summary(4);
}

main();
