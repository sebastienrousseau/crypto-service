// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * List all algorithms supported by the Crypto Service.
 *
 * Run: `npx ts-node examples/algorithms.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";
import { header, taskWithOutput, summary } from "./support";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  header("crypto-sdk -- algorithms");

  await taskWithOutput("Fetch supported algorithms", async () => {
    const { data } = await client.algorithms();
    const lines: string[] = [];
    for (const [category, algos] of Object.entries(data)) {
      lines.push(`${category}: ${(algos as string[]).join(", ")}`);
    }
    return lines;
  });

  summary(1);
}

main().catch(console.error);
