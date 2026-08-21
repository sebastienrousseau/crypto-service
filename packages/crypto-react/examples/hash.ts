// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * SHA-256, SHA3-256, and BLAKE3 hashing via the useHash hook.
 *
 * Demonstrates computing cryptographic digests with multiple algorithms
 * and inspecting the reactive state.
 *
 * Run: `npx ts-node examples/hash.ts`
 */

import { header, task, summary } from "./support";
import { useHash } from "../src";

async function main() {
  header("crypto-react -- hash");

  const { hash, digest, isHashing } = useHash("sha256");

  await task("Hash with SHA-256 (default algorithm)", () => {
    const d = hash("Hello, world!");
    if (!d || d.length === 0) throw new Error("Empty digest");
  });

  await task("Hash with SHA3-256 (override algorithm)", () => {
    const d = hash("Hello, world!", "sha3-256");
    if (!d || d.length === 0) throw new Error("Empty digest");
  });

  await task("Hash with BLAKE3", () => {
    const d = hash("Hello, world!", "blake3");
    if (!d || d.length === 0) throw new Error("Empty digest");
  });

  await task("Verify digest state is updated", () => {
    if (!digest) throw new Error("Digest state is null");
  });

  await task("Confirm isHashing flag is false after completion", () => {
    if (isHashing) throw new Error("Expected isHashing to be false");
  });

  summary(5);
}

main();
