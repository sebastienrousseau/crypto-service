// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * HMAC compute and verify via POST /v2/hmac and POST /v2/hmac/verify.
 *
 * Demonstrates HMAC-SHA256 and HMAC-SHA512 operations.
 *
 * Run: `npx ts-node examples/hmac.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

const BASE = process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000";
const API_KEY = process.env.CRYPTO_API_KEY ?? "test-key";

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  console.log("\n=== crypto-server — hmac ===\n");

  const key = "my-hmac-secret-key";
  const data = "Message to authenticate";

  // Compute HMAC-SHA256
  const hmacResult = await post("/v2/hmac", {
    algorithm: "sha256",
    key,
    data,
  });
  console.log("HMAC-SHA256:", hmacResult.data);

  // Verify HMAC
  const verifyResult = await post("/v2/hmac/verify", {
    algorithm: "sha256",
    key,
    data,
    mac: hmacResult.data,
  });
  console.log("Valid:", verifyResult.data);

  // Compute HMAC-SHA512
  const hmac512 = await post("/v2/hmac", {
    algorithm: "sha512",
    key,
    data,
  });
  console.log("HMAC-SHA512:", hmac512.data);

  console.log("\nDone.");
}

main().catch(console.error);
