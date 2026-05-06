// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Streaming hash: compute a digest incrementally over chunks of data
 * without buffering the entire input in memory.
 *
 * Run: `npx ts-node examples/stream.ts`
 */

import { createHasher, hash } from "../src";

function main() {
  console.log("\n=== crypto-lib — stream ===\n");

  // Incremental SHA-256 hashing
  const hasher = createHasher("sha256");
  hasher.update("Hello, ");
  hasher.update("streaming ");
  hasher.update("world!");
  const digest = hasher.digest();
  console.log(`Streaming SHA-256:  ${digest}`);

  // Compare with one-shot hash
  const oneshot = hash({ algorithm: "sha256", data: "Hello, streaming world!" });
  console.log(`One-shot SHA-256:   ${oneshot.digest}`);
  console.log(`Match:              ${digest === oneshot.digest}`);

  // Streaming BLAKE3
  const b3 = createHasher("blake3");
  b3.update("chunk1");
  b3.update("chunk2");
  b3.update("chunk3");
  console.log(`\nStreaming BLAKE3:    ${b3.digest()}`);

  // Simulate processing large data in chunks
  const sha3 = createHasher("sha3-256");
  for (let i = 0; i < 100; i++) {
    sha3.update(`block-${i}-`);
  }
  console.log(`SHA3-256 (100 chunks): ${sha3.digest().slice(0, 40)}...`);

  console.log("\nDone.");
}

main();
