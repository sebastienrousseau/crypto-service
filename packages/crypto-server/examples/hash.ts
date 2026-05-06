// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Hash data via POST /v2/hash.
 *
 * Demonstrates SHA-256 and SHA3-256 hashing through the REST API.
 *
 * Run: `npx ts-node examples/hash.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

const BASE = process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000";
const API_KEY = process.env.CRYPTO_API_KEY ?? "test-key";

async function main() {
  console.log("\n=== crypto-server — hash ===\n");

  // SHA-256
  const sha256Res = await fetch(`${BASE}/v2/hash`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({
      algorithm: "sha256",
      data: "Hello, world!",
    }),
  });
  const sha256 = await sha256Res.json();
  console.log("SHA-256:", sha256.data);

  // SHA3-256
  const sha3Res = await fetch(`${BASE}/v2/hash`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({
      algorithm: "sha3-256",
      data: "Hello, world!",
    }),
  });
  const sha3 = await sha3Res.json();
  console.log("SHA3-256:", sha3.data);

  console.log("\nDone.");
}

main().catch(console.error);
