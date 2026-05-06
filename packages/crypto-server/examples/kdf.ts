// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Key derivation via POST /v2/kdf.
 *
 * Demonstrates scrypt, HKDF-SHA256, and PBKDF2-SHA256 key derivation.
 *
 * Run: `npx ts-node examples/kdf.ts`
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
  console.log("\n=== crypto-server — kdf ===\n");

  // scrypt
  const scryptResult = await post("/v2/kdf", {
    algorithm: "scrypt",
    password: "my-password",
    keyLength: 32,
    params: { N: 16384, r: 8, p: 1 },
  });
  console.log("scrypt derived key:", JSON.stringify(scryptResult.data, null, 2));

  // HKDF-SHA256
  const hkdfResult = await post("/v2/kdf", {
    algorithm: "hkdf-sha256",
    password: "input-key-material",
    keyLength: 32,
    params: { info: "application-context" },
  });
  console.log("HKDF-SHA256:", JSON.stringify(hkdfResult.data, null, 2));

  // PBKDF2-SHA256
  const pbkdf2Result = await post("/v2/kdf", {
    algorithm: "pbkdf2-sha256",
    password: "my-password",
    keyLength: 32,
    params: { iterations: 100000 },
  });
  console.log("PBKDF2-SHA256:", JSON.stringify(pbkdf2Result.data, null, 2));

  console.log("\nDone.");
}

main().catch(console.error);
