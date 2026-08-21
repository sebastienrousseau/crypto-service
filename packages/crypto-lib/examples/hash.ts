// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Hash data with SHA-256, SHA-3, BLAKE2b, and BLAKE3.
 *
 * Run: `npx ts-node examples/hash.ts`
 */

import { header, task, taskWithOutput, summary } from "./support";
import { hash } from "../src";

async function main() {
  header("crypto-lib -- hash");

  const data = "Hello, crypto-lib!";

  await taskWithOutput("Hash with SHA-256 (FIPS 180-4)", () => {
    const r = hash({ algorithm: "sha256", data });
    return [`${r.digest} (${r.length} bytes)`];
  });

  await taskWithOutput("Hash with SHA3-256 (FIPS 202)", () => {
    const r = hash({ algorithm: "sha3-256", data });
    return [`${r.digest} (${r.length} bytes)`];
  });

  await taskWithOutput("Hash with SHA-512 (FIPS 180-4)", () => {
    const r = hash({ algorithm: "sha512", data });
    return [`${r.digest.slice(0, 40)}... (${r.length} bytes)`];
  });

  await taskWithOutput("Hash with BLAKE3", () => {
    const r = hash({ algorithm: "blake3", data });
    return [`${r.digest} (${r.length} bytes)`];
  });

  await taskWithOutput("Hash with BLAKE2b (RFC 7693)", () => {
    const r = hash({ algorithm: "blake2b", data });
    return [`${r.digest.slice(0, 40)}... (${r.length} bytes)`];
  });

  await task("Hash raw bytes", () => {
    const bytes = new Uint8Array([0x01, 0x02, 0x03]);
    hash({ algorithm: "sha256", data: bytes });
  });

  summary(6);
}

main();
