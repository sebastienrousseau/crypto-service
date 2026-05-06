// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Hash data using different algorithms via the Crypto SDK.
 *
 * Run: `npx ts-node examples/hash.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  console.log("\n=== crypto-sdk — hash ===\n");

  // SHA-256
  const sha256 = await client.hash({ algorithm: "sha256", data: "hello world" });
  console.log("SHA-256 digest:", sha256.data.digest);
  console.log("Algorithm:     ", sha256.data.algorithm);
  console.log("Length:        ", sha256.data.length);

  // SHA-512
  const sha512 = await client.hash({ algorithm: "sha512", data: "hello world" });
  console.log("\nSHA-512 digest:", sha512.data.digest);

  // BLAKE2b-256
  const blake2b = await client.hash({ algorithm: "blake2b-256", data: "hello world" });
  console.log("BLAKE2b digest:", blake2b.data.digest);

  console.log("\nDone.");
}

main().catch(console.error);
