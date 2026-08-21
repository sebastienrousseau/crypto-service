// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Streaming hash: compute a digest incrementally over chunks of data
 * without buffering the entire input in memory.
 *
 * Run: `npx ts-node examples/stream.ts`
 */

import { header, task, summary } from "./support";
import { createHasher, hash } from "../src";

async function main() {
  header("crypto-lib -- stream");

  await task("Incremental SHA-256 matches one-shot", () => {
    const hasher = createHasher("sha256");
    hasher.update("Hello, ");
    hasher.update("streaming ");
    hasher.update("world!");
    const digest = hasher.digest();
    const oneshot = hash({ algorithm: "sha256", data: "Hello, streaming world!" });
    if (digest !== oneshot.digest) throw new Error("Mismatch");
  });

  await task("Stream BLAKE3 over chunks", () => {
    const b3 = createHasher("blake3");
    b3.update("chunk1");
    b3.update("chunk2");
    b3.update("chunk3");
    b3.digest();
  });

  await task("Stream SHA3-256 over 100 chunks", () => {
    const sha3 = createHasher("sha3-256");
    for (let i = 0; i < 100; i++) {
      sha3.update(`block-${i}-`);
    }
    sha3.digest();
  });

  summary(3);
}

main();
