// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Post-quantum signing with ML-DSA (FIPS 204).
 *
 * Demonstrates key generation, signing, and verification at
 * security level 65 (ML-DSA-65).
 *
 * Run: `npx ts-node examples/pqsign.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  console.log("\n=== crypto-sdk — pqsign ===\n");

  // Generate an ML-DSA-65 key pair
  const keys = await client.pqSignKeygen({ level: 65 });
  console.log("Algorithm:  ", keys.data.algorithm);
  console.log("Public key: ", keys.data.publicKey.slice(0, 32) + "...");

  // Sign a message
  const message = "Post-quantum authenticated message";
  const signed = await client.pqSign({
    level: 65,
    secretKey: keys.data.secretKey,
    message,
  });
  console.log("\nSignature:", signed.data.signature.slice(0, 32) + "...");

  // Verify the signature
  const verified = await client.pqVerify({
    level: 65,
    publicKey: keys.data.publicKey,
    message,
    signature: signed.data.signature,
  });
  console.log("Valid:    ", verified.data.valid);

  // Demonstrate verification failure with a tampered message
  const tampered = await client.pqVerify({
    level: 65,
    publicKey: keys.data.publicKey,
    message: "tampered message",
    signature: signed.data.signature,
  });
  console.log("Tampered: ", tampered.data.valid);

  console.log("\nDone.");
}

main().catch(console.error);
