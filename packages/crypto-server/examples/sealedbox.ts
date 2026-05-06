// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Sealed box operations via POST /v2/sealedbox/*.
 *
 * Anonymous public-key encryption using X25519, plus the post-quantum
 * hybrid variant (X25519 + ML-KEM-768).
 *
 * Run: `npx ts-node examples/sealedbox.ts`
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
  console.log("\n=== crypto-server — sealedbox ===\n");

  // Generate X25519 key pair for classical sealed box
  const x25519Keys = await post("/v2/keys/generate", { algorithm: "x25519" });
  const { publicKey, privateKey } = x25519Keys.data;

  // Seal (classical)
  const sealed = await post("/v2/sealedbox/seal", {
    recipientPublicKey: publicKey,
    plaintext: "Anonymous message",
  });
  console.log("Sealed:", sealed.data.slice(0, 60) + "...");

  // Open (classical)
  const opened = await post("/v2/sealedbox/open", {
    recipientSecretKey: privateKey,
    sealed: sealed.data,
  });
  console.log("Opened:", opened.data);

  // Post-quantum sealed box
  console.log("\n--- PQ Sealed Box ---");
  const x25519Pair = await post("/v2/keys/generate", { algorithm: "x25519" });
  const mlKemPair = await post("/v2/keys/generate", {
    algorithm: "ml-kem-768",
  });

  const pqSealed = await post("/v2/sealedbox/seal-pq", {
    x25519PublicKey: x25519Pair.data.publicKey,
    mlKemPublicKey: mlKemPair.data.publicKey,
    plaintext: "Quantum-safe message",
  });
  console.log("PQ Sealed:", JSON.stringify(pqSealed.data).slice(0, 60) + "...");

  const pqOpened = await post("/v2/sealedbox/open-pq", {
    x25519SecretKey: x25519Pair.data.privateKey,
    mlKemSecretKey: mlKemPair.data.privateKey,
    sealed: pqSealed.data,
  });
  console.log("PQ Opened:", pqOpened.data);

  console.log("\nDone.");
}

main().catch(console.error);
