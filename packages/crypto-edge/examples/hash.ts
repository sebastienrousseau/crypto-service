/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Edge-compatible hashing example.
 *
 * Demonstrates all supported hash algorithms using the Web Crypto API
 * wrapper. Works identically on every supported runtime.
 *
 * Run with:
 *   npx ts-node examples/hash.ts
 */

import { hash } from "../src";

async function main(): Promise<void> {
  const data = "The quick brown fox jumps over the lazy dog";

  console.log(`Input: "${data}"\n`);

  // SHA-1 (legacy, avoid for security)
  const sha1 = await hash("SHA-1", data);
  console.log(`SHA-1:   ${sha1}`);

  // SHA-256
  const sha256 = await hash("SHA-256", data);
  console.log(`SHA-256: ${sha256}`);

  // SHA-384
  const sha384 = await hash("SHA-384", data);
  console.log(`SHA-384: ${sha384}`);

  // SHA-512
  const sha512 = await hash("SHA-512", data);
  console.log(`SHA-512: ${sha512}`);

  // Hash binary data
  const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff]);
  const binaryHash = await hash("SHA-256", binaryData);
  console.log(`\nSHA-256(binary): ${binaryHash}`);

  // Verify known test vector (SHA-256 of empty string)
  const emptyHash = await hash("SHA-256", "");
  const expected = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  console.log(`\nSHA-256(""): ${emptyHash}`);
  console.log(`Matches known vector: ${emptyHash === expected}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Hash example failed:", err);
  process.exit(1);
});
