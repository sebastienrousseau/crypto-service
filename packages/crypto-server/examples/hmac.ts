// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * HMAC compute and verify via POST /v2/hmac and POST /v2/hmac/verify.
 *
 * Demonstrates HMAC-SHA256 and HMAC-SHA512 operations.
 *
 * Run: `npx ts-node examples/hmac.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { header, task, summary } from "./support";

const BASE = process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000";
const API_KEY = process.env.CRYPTO_API_KEY ?? "test-key";

function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
    body: JSON.stringify(body),
  });
}

async function main() {
  header("crypto-server -- hmac");

  const key = "my-hmac-secret-key";
  const data = "Message to authenticate";

  const mac = await task("Compute HMAC-SHA256", async () => {
    const res = await post("/v2/hmac", { algorithm: "sha256", key, data });
    const body = (await res.json()) as { data: string };
    return body.data;
  });

  await task("Verify HMAC-SHA256", async () => {
    const res = await post("/v2/hmac/verify", { algorithm: "sha256", key, data, mac });
    const body = (await res.json()) as { data: boolean };
    if (!body.data) throw new Error("Verification failed");
  });

  await task("Compute HMAC-SHA512", async () => {
    const res = await post("/v2/hmac", { algorithm: "sha512", key, data });
    const body = (await res.json()) as { data: string };
    if (!body.data) throw new Error("No MAC returned");
  });

  summary(3);
}

main().catch(console.error);
