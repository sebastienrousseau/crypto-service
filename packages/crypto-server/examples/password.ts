// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Hash and verify a password via POST /v2/password/hash and
 * POST /v2/password/verify.
 *
 * Uses Argon2id with configurable parameters.
 *
 * Run: `npx ts-node examples/password.ts`
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
  header("crypto-server -- password");

  const password = "my-secure-password";

  const hashData = await task("Hash password with Argon2id", async () => {
    const res = await post("/v2/password/hash", {
      password,
      timeCost: 3,
      memoryCost: 65536,
      parallelism: 1,
    });
    const body = (await res.json()) as {
      data: { hash: string; salt: string; params: unknown };
    };
    return body.data;
  });

  await task("Verify password against hash", async () => {
    const res = await post("/v2/password/verify", {
      password,
      hash: hashData.hash,
      salt: hashData.salt,
      params: hashData.params,
    });
    const body = (await res.json()) as { data: boolean };
    if (!body.data) throw new Error("Verification failed");
  });

  summary(2);
}

main().catch(console.error);
