// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Graceful fallback demo -- operations work even without a compiled
 * WASM module.
 *
 * Intentionally skips `init()` first to show that the JS fallback
 * produces correct results, then calls `init()` and confirms the
 * output is identical.
 *
 * Run: `npx ts-node examples/fallback.ts`
 */

import { header, task, summary } from "./support";
import { WasmAccelerator, isWasmSupported } from "../src";

async function main() {
  header("crypto-wasm -- fallback");

  const accel = new WasmAccelerator();
  const data = new TextEncoder().encode("fallback test");

  await task("Confirm WASM runtime detection runs without error", () => {
    isWasmSupported();
  });

  const hex1 = await task("Hash via JS fallback (before init)", async () => {
    const digest = await accel.hash("sha256", data);
    if (digest.length === 0) throw new Error("Empty digest");
    return Buffer.from(digest).toString("hex");
  });

  await task("Call init() (graceful even without .wasm file)", async () => {
    await accel.init();
  });

  const hex2 = await task("Hash again after init", async () => {
    const digest = await accel.hash("sha256", data);
    if (digest.length === 0) throw new Error("Empty digest");
    return Buffer.from(digest).toString("hex");
  });

  await task("Verify both digests are identical", () => {
    if (hex1 !== hex2) {
      throw new Error(`Digest mismatch: ${hex1} !== ${hex2}`);
    }
  });

  summary(5);
}

main();
