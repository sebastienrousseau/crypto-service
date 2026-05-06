// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Encrypt and decrypt data with AES-256-GCM via the Crypto SDK.
 *
 * Run: `npx ts-node examples/encrypt.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  console.log("\n=== crypto-sdk — encrypt ===\n");

  const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const plaintext = "Sensitive message that must be encrypted";

  // Encrypt
  const encrypted = await client.encrypt({ key, plaintext });
  console.log("Ciphertext:", encrypted.data.ciphertext);
  console.log("Algorithm: ", encrypted.data.algorithm);

  // Decrypt
  const decrypted = await client.decrypt({ key, ciphertext: encrypted.data.ciphertext });
  console.log("Decrypted: ", decrypted.data.plaintext);

  console.log("\nDone.");
}

main().catch(console.error);
