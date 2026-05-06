// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Hash data with SHA-256, SHA-3, and BLAKE3.
 *
 * Run: `npx ts-node examples/hash.ts`
 */

import { hash } from "../src";

function main() {
  console.log("\n=== crypto-lib — hash ===\n");

  const data = "Hello, crypto-lib!";

  // SHA-256 (FIPS 180-4)
  const sha256 = hash({ algorithm: "sha256", data });
  console.log(`SHA-256:   ${sha256.digest} (${sha256.length} bytes)`);

  // SHA3-256 (FIPS 202)
  const sha3 = hash({ algorithm: "sha3-256", data });
  console.log(`SHA3-256:  ${sha3.digest} (${sha3.length} bytes)`);

  // SHA-512 (FIPS 180-4)
  const sha512 = hash({ algorithm: "sha512", data });
  console.log(`SHA-512:   ${sha512.digest.slice(0, 40)}... (${sha512.length} bytes)`);

  // BLAKE3
  const b3 = hash({ algorithm: "blake3", data });
  console.log(`BLAKE3:    ${b3.digest} (${b3.length} bytes)`);

  // BLAKE2b (RFC 7693)
  const b2 = hash({ algorithm: "blake2b", data });
  console.log(`BLAKE2b:   ${b2.digest.slice(0, 40)}... (${b2.length} bytes)`);

  // Hash raw bytes
  const bytes = new Uint8Array([0x01, 0x02, 0x03]);
  const raw = hash({ algorithm: "sha256", data: bytes });
  console.log(`\nSHA-256 of [0x01,0x02,0x03]: ${raw.digest}`);

  console.log("\nDone.");
}

main();
