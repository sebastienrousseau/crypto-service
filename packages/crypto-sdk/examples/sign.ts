// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Generate a key pair, sign a message, and verify the signature.
 *
 * Run: `npx ts-node examples/sign.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  console.log("\n=== crypto-sdk — sign ===\n");

  // Generate an Ed25519 key pair
  const keys = await client.generateKeyPair({ algorithm: "ed25519" });
  console.log("Public key: ", keys.data.publicKey.slice(0, 32) + "...");
  console.log("Algorithm:  ", keys.data.algorithm);
  console.log("Key ID:     ", keys.data.kid);

  // Sign a message
  const message = "This message is authentic";
  const signed = await client.sign({
    privateKey: keys.data.privateKey,
    message,
  });
  console.log("\nSignature:", signed.data.signature.slice(0, 32) + "...");

  // Verify the signature
  const verified = await client.verify({
    publicKey: keys.data.publicKey,
    message,
    signature: signed.data.signature,
  });
  console.log("Valid:    ", verified.data.valid);

  console.log("\nDone.");
}

main().catch(console.error);
