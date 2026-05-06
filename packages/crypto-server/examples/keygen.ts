// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Generate key pairs for various algorithms via POST /v2/keys/generate.
 *
 * Demonstrates Ed25519, X25519, P-256, and ML-KEM-768 key generation.
 *
 * Run: `npx ts-node examples/keygen.ts`
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
  console.log("\n=== crypto-server — keygen ===\n");

  const algorithms = ["ed25519", "x25519", "p256", "ml-kem-768"];

  for (const algorithm of algorithms) {
    const result = await post("/v2/keys/generate", { algorithm });
    console.log(`${algorithm}:`);
    console.log(`  publicKey: ${result.data.publicKey.slice(0, 40)}...`);
    console.log();
  }

  // With metadata
  const withMeta = await post("/v2/keys/generate", {
    algorithm: "ed25519",
    metadata: { kid: "my-signing-key", use: "sig" },
  });
  console.log("With metadata:", JSON.stringify(withMeta.data, null, 2));

  console.log("\nDone.");
}

main().catch(console.error);
