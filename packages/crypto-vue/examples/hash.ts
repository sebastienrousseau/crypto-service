// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * SHA-256, SHA3-256, and BLAKE3 hashing via the useHash composable.
 *
 * Demonstrates computing cryptographic digests with multiple algorithms
 * and inspecting the reactive state.
 *
 * Run: `npx ts-node examples/hash.ts`
 */

import { header, task, summary } from "./support";
import { useHash } from "../src";

async function main() {
  header("crypto-vue -- hash");

  const { hash, digest, algorithm, isHashing, error } = useHash();

  await task("Hash with SHA-256", async () => {
    const d = await hash("sha256", "hello world");
    if (!d || d.length === 0) throw new Error("Empty digest");
  });

  await task("Hash with SHA3-256", async () => {
    const d = await hash("sha3-256", "hello world");
    if (!d || d.length === 0) throw new Error("Empty digest");
  });

  await task("Hash with BLAKE3", async () => {
    const d = await hash("blake3", "hello world");
    if (!d || d.length === 0) throw new Error("Empty digest");
  });

  await task("Verify digest state is updated", () => {
    if (!digest.value) throw new Error("Digest state is null");
  });

  await task("Verify algorithm state is updated", () => {
    if (!algorithm.value) throw new Error("Algorithm state is null");
  });

  await task("Confirm isHashing is false after completion", () => {
    if (isHashing.value) throw new Error("Expected isHashing to be false");
  });

  await task("Confirm no errors occurred", () => {
    if (error.value) throw new Error(`Unexpected error: ${error.value.message}`);
  });

  summary(7);
}

main();
