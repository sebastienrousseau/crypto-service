// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * List all algorithms supported by the Crypto Service.
 *
 * Run: `npx ts-node examples/algorithms.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  console.log("\n=== crypto-sdk — algorithms ===\n");

  const { data } = await client.algorithms();

  for (const [category, algos] of Object.entries(data)) {
    console.log(`${category}:`);
    for (const algo of algos) {
      console.log(`  - ${algo}`);
    }
    console.log();
  }

  console.log("Done.");
}

main().catch(console.error);
