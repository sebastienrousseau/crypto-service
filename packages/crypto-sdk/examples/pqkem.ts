// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Post-quantum hybrid key exchange (X25519 + ML-KEM).
 *
 * Demonstrates key generation, encapsulation, and decapsulation to
 * establish a shared secret between two parties.
 *
 * Run: `npx ts-node examples/pqkem.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  console.log("\n=== crypto-sdk — pqkem ===\n");

  // Generate a hybrid key pair (X25519 + ML-KEM)
  const keys = await client.pqGenerateKeyPair();
  console.log("Algorithm:          ", keys.data.algorithm);
  console.log("X25519 public key:  ", keys.data.x25519PublicKey.slice(0, 24) + "...");
  console.log("ML-KEM public key:  ", keys.data.mlKemPublicKey.slice(0, 24) + "...");

  // Encapsulate — sender creates a shared secret for the recipient
  const encap = await client.pqEncapsulate({
    x25519PublicKey: keys.data.x25519PublicKey,
    mlKemPublicKey: keys.data.mlKemPublicKey,
  });
  console.log("\nEncapsulated:");
  console.log("  Shared secret:     ", encap.data.sharedSecret.slice(0, 24) + "...");
  console.log("  ML-KEM ciphertext: ", encap.data.mlKemCiphertext.slice(0, 24) + "...");

  // Decapsulate — recipient recovers the same shared secret
  const decap = await client.pqDecapsulate({
    x25519PrivateKey: keys.data.x25519PrivateKey,
    mlKemSecretKey: keys.data.mlKemSecretKey,
    x25519EphemeralPublic: encap.data.x25519EphemeralPublic,
    mlKemCiphertext: encap.data.mlKemCiphertext,
  });
  console.log("\nDecapsulated:");
  console.log("  Shared secret:     ", decap.data.sharedSecret.slice(0, 24) + "...");

  // Both shared secrets should be identical
  const match = encap.data.sharedSecret === decap.data.sharedSecret;
  console.log("\nSecrets match:", match);

  console.log("\nDone.");
}

main().catch(console.error);
