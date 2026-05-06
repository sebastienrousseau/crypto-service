// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Post-quantum KEM operations via POST /v2/pq/*.
 *
 * Demonstrates ML-KEM-768 (FIPS 203) key generation, encapsulation,
 * and decapsulation, plus the hybrid X25519 + ML-KEM-768 variant.
 *
 * Run: `npx ts-node examples/pqkem.ts`
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
  console.log("\n=== crypto-server — pqkem ===\n");

  // --- ML-KEM-768 standalone ---
  console.log("--- ML-KEM-768 ---");
  const keyPair = await post("/v2/pq/keygen", {});
  console.log("Public key length:", keyPair.data.publicKey.length);

  const encap = await post("/v2/pq/encapsulate", {
    publicKey: keyPair.data.publicKey,
  });
  console.log("Shared secret (sender):", encap.data.sharedSecret.slice(0, 32) + "...");

  const decap = await post("/v2/pq/decapsulate", {
    secretKey: keyPair.data.secretKey,
    ciphertext: encap.data.ciphertext,
  });
  console.log("Shared secret (recipient):", decap.data.slice(0, 32) + "...");

  // --- Hybrid X25519 + ML-KEM-768 ---
  console.log("\n--- Hybrid X25519 + ML-KEM-768 ---");
  const hybridKeys = await post("/v2/pq/hybrid/keygen", {});
  console.log("X25519 public key:", hybridKeys.data.x25519PublicKey);

  const hybridEncap = await post("/v2/pq/hybrid/encapsulate", {
    x25519PublicKey: hybridKeys.data.x25519PublicKey,
    mlKemPublicKey: hybridKeys.data.mlKemPublicKey,
  });
  console.log("Hybrid shared secret:", hybridEncap.data.sharedSecret.slice(0, 32) + "...");

  const hybridDecap = await post("/v2/pq/hybrid/decapsulate", {
    x25519PrivateKey: hybridKeys.data.x25519PrivateKey,
    mlKemSecretKey: hybridKeys.data.mlKemSecretKey,
    x25519EphemeralPublic: hybridEncap.data.x25519EphemeralPublic,
    mlKemCiphertext: hybridEncap.data.mlKemCiphertext,
  });
  console.log("Hybrid recovered secret:", hybridDecap.data.slice(0, 32) + "...");

  console.log("\nDone.");
}

main().catch(console.error);
