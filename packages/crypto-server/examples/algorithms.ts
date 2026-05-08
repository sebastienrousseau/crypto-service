// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * List all supported algorithms via GET /v2/algorithms.
 *
 * This endpoint does not require authentication.
 *
 * Run: `npx ts-node examples/algorithms.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { header, taskWithOutput, summary } from "./support";

const BASE = process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000";

async function main() {
  header("crypto-server -- algorithms");

  await taskWithOutput("Fetch supported algorithms", async () => {
    const res = await fetch(`${BASE}/v2/algorithms`);
    const body = (await res.json()) as { data: Record<string, string[]> };
    const lines: string[] = [];
    for (const [category, algos] of Object.entries(body.data)) {
      lines.push(`${category}: ${(algos as string[]).join(", ")}`);
    }
    return lines;
  });

  summary(1);
}

main().catch(console.error);
