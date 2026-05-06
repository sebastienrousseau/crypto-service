// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Health and readiness checks via GET /live, GET /ready, and GET /metrics.
 *
 * These infrastructure probes do not require authentication.
 *
 * Run: `npx ts-node examples/probes.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

const BASE = process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000";

async function main() {
  console.log("\n=== crypto-server — probes ===\n");

  // Liveness
  const liveRes = await fetch(`${BASE}/live`);
  const live = await liveRes.json();
  console.log("Liveness:", JSON.stringify(live));

  // Readiness
  const readyRes = await fetch(`${BASE}/ready`);
  const ready = await readyRes.json();
  console.log("Readiness:", JSON.stringify(ready));

  // Metrics
  const metricsRes = await fetch(`${BASE}/metrics`);
  const metrics = await metricsRes.text();
  console.log("\nMetrics (first 5 lines):");
  metrics
    .split("\n")
    .slice(0, 5)
    .forEach((line) => console.log(`  ${line}`));

  console.log("\nDone.");
}

main().catch(console.error);
