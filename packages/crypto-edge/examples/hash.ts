// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Edge-compatible hashing with all supported Web Crypto algorithms.
 *
 * Run: `npx ts-node examples/hash.ts`
 */

import { hash } from "../src";
import { header, taskWithOutput, summary } from "./support";

async function main() {
  header("crypto-edge -- hash");

  const data = "The quick brown fox jumps over the lazy dog";

  await taskWithOutput("SHA-1 (legacy)", async () => {
    const digest = await hash("SHA-1", data);
    return [digest];
  });

  await taskWithOutput("SHA-256", async () => {
    const digest = await hash("SHA-256", data);
    return [digest];
  });

  await taskWithOutput("SHA-384", async () => {
    const digest = await hash("SHA-384", data);
    return [digest];
  });

  await taskWithOutput("SHA-512", async () => {
    const digest = await hash("SHA-512", data);
    return [digest];
  });

  await taskWithOutput("SHA-256 of binary data", async () => {
    const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff]);
    const digest = await hash("SHA-256", binaryData);
    return [digest];
  });

  await taskWithOutput("Verify SHA-256 empty-string test vector", async () => {
    const digest = await hash("SHA-256", "");
    const expected =
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    return [`match: ${digest === expected}`];
  });

  summary(6);
}

main();
