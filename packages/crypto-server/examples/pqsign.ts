// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Post-quantum signing via POST /v2/pq/dsa/*.
 *
 * Demonstrates ML-DSA-65 (FIPS 204) key generation, signing, and
 * verification.
 *
 * Run: `npx ts-node examples/pqsign.ts`
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
  console.log("\n=== crypto-server — pqsign ===\n");

  const level = 65; // ML-DSA-65

  // Generate key pair
  const keyPair = await post("/v2/pq/dsa/keygen", { level });
  console.log("ML-DSA-65 public key length:", keyPair.data.publicKey.length);

  // Sign a message
  const message = "Post-quantum signatures are here!";
  const signResult = await post("/v2/pq/dsa/sign", {
    level,
    secretKey: keyPair.data.secretKey,
    message,
  });
  console.log("Signature length:", signResult.data.length);

  // Verify
  const verifyResult = await post("/v2/pq/dsa/verify", {
    level,
    publicKey: keyPair.data.publicKey,
    message,
    signature: signResult.data,
  });
  console.log("Valid:", verifyResult.data);

  console.log("\nDone.");
}

main().catch(console.error);
