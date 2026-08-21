// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Hash data via POST /v2/hash.
 *
 * Demonstrates SHA-256 and SHA3-256 hashing through the REST API.
 *
 * Run: `npx ts-node examples/hash.ts`
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
  header("crypto-server -- hash");

  await task("Hash with SHA-256", async () => {
    const res = await post("/v2/hash", { algorithm: "sha256", data: "Hello, world!" });
    const body = (await res.json()) as { data: string };
    if (!body.data) throw new Error("No digest returned");
  });

  await task("Hash with SHA3-256", async () => {
    const res = await post("/v2/hash", { algorithm: "sha3-256", data: "Hello, world!" });
    const body = (await res.json()) as { data: string };
    if (!body.data) throw new Error("No digest returned");
  });

  summary(2);
}

main().catch(console.error);
