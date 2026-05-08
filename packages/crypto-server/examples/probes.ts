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

import { header, task, summary } from "./support";

const BASE = process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000";

async function main() {
  header("crypto-server -- probes");

  await task("Liveness probe (GET /live)", async () => {
    const res = await fetch(`${BASE}/live`);
    const body = (await res.json()) as { status: string };
    if (!body.status) throw new Error("No status returned");
  });

  await task("Readiness probe (GET /ready)", async () => {
    const res = await fetch(`${BASE}/ready`);
    const body = (await res.json()) as { status: string };
    if (!body.status) throw new Error("No status returned");
  });

  await task("Metrics probe (GET /metrics)", async () => {
    const res = await fetch(`${BASE}/metrics`);
    const text = await res.text();
    if (!text) throw new Error("No metrics returned");
  });

  summary(3);
}

main().catch(console.error);
