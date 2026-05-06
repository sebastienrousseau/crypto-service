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

const BASE = process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000";

async function main() {
  console.log("\n=== crypto-server — algorithms ===\n");

  const res = await fetch(`${BASE}/v2/algorithms`);
  const body = await res.json();

  console.log("Supported algorithms:");
  console.log(JSON.stringify(body.data, null, 2));

  console.log("\nDone.");
}

main().catch(console.error);
