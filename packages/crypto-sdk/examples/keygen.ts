// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Generate key pairs for multiple algorithms.
 *
 * Run: `npx ts-node examples/keygen.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  console.log("\n=== crypto-sdk — keygen ===\n");

  const algorithms = ["ed25519", "ed448", "ecdsa-p256", "ecdsa-p384"];

  for (const algorithm of algorithms) {
    const keys = await client.generateKeyPair({ algorithm });
    console.log(`${algorithm}:`);
    console.log("  Public key:", keys.data.publicKey.slice(0, 32) + "...");
    console.log("  Key ID:   ", keys.data.kid);
    console.log("  Algorithm:", keys.data.algorithm);
    console.log();
  }

  // Default (ed25519) when no algorithm is specified
  const defaultKeys = await client.generateKeyPair();
  console.log("Default (no algorithm specified):");
  console.log("  Algorithm:", defaultKeys.data.algorithm);
  console.log("  Key ID:   ", defaultKeys.data.kid);

  console.log("\nDone.");
}

main().catch(console.error);
