// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Symmetric authenticated encryption with secretbox (seal / open).
 *
 * Run: `npx ts-node examples/secretbox.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  console.log("\n=== crypto-sdk — secretbox ===\n");

  const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const plaintext = "Top-secret information";

  // Seal
  const sealed = await client.secretboxSeal({ key, plaintext });
  console.log("Sealed:", sealed.data.sealed.slice(0, 40) + "...");

  // Seal with additional authenticated data (AAD)
  const sealedAad = await client.secretboxSeal({
    key,
    plaintext,
    aad: "context-metadata",
  });
  console.log("Sealed (AAD):", sealedAad.data.sealed.slice(0, 40) + "...");

  // Open
  const opened = await client.secretboxOpen({ key, ciphertext: sealed.data.sealed });
  console.log("Opened:", opened.data.plaintext);

  console.log("\nDone.");
}

main().catch(console.error);
