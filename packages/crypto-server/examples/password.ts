// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Hash and verify a password via POST /v2/password/hash and
 * POST /v2/password/verify.
 *
 * Uses Argon2id with configurable parameters.
 *
 * Run: `npx ts-node examples/password.ts`
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
  console.log("\n=== crypto-server — password ===\n");

  const password = "my-secure-password";

  // Hash
  const hashResult = await post("/v2/password/hash", {
    password,
    timeCost: 3,
    memoryCost: 65536,
    parallelism: 1,
  });
  console.log("Hash result:", JSON.stringify(hashResult.data, null, 2));

  // Verify
  const verifyResult = await post("/v2/password/verify", {
    password,
    hash: hashResult.data.hash,
    salt: hashResult.data.salt,
    params: hashResult.data.params,
  });
  console.log("Verified:", verifyResult.data);

  console.log("\nDone.");
}

main().catch(console.error);
