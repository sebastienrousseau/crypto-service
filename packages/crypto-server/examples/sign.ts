// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Sign and verify a message via POST /v2/sign and POST /v2/verify.
 *
 * Generates an Ed25519 key pair via the keys endpoint, then signs and
 * verifies a message.
 *
 * Run: `npx ts-node examples/sign.ts`
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
  console.log("\n=== crypto-server — sign ===\n");

  // Generate an Ed25519 key pair
  const keyPair = await post("/v2/keys/generate", { algorithm: "ed25519" });
  const { publicKey, privateKey } = keyPair.data;
  console.log("Public key:", publicKey);

  // Sign
  const message = "Hello, crypto!";
  const signResult = await post("/v2/sign", { privateKey, message });
  console.log("Signature:", signResult.data);

  // Verify
  const verifyResult = await post("/v2/verify", {
    publicKey,
    message,
    signature: signResult.data,
  });
  console.log("Valid:", verifyResult.data);

  console.log("\nDone.");
}

main().catch(console.error);
