// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Post-quantum signing via POST /v2/pq/dsa/*.
 *
 * Demonstrates ML-DSA-65 (FIPS 204) key generation, signing, and
 * verification.
 *
 * Run: `npx ts-node examples/pqsign.ts`
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
  header("crypto-server -- pqsign");

  const level = 65;

  const keyPair = await task("Generate ML-DSA-65 key pair", async () => {
    const res = await post("/v2/pq/dsa/keygen", { level });
    const body = (await res.json()) as {
      data: { publicKey: string; secretKey: string };
    };
    return body.data;
  });

  const message = "Post-quantum signatures are here!";

  const signature = await task("Sign message with ML-DSA-65", async () => {
    const res = await post("/v2/pq/dsa/sign", {
      level,
      secretKey: keyPair.secretKey,
      message,
    });
    const body = (await res.json()) as { data: string };
    return body.data;
  });

  await task("Verify ML-DSA-65 signature", async () => {
    const res = await post("/v2/pq/dsa/verify", {
      level,
      publicKey: keyPair.publicKey,
      message,
      signature,
    });
    const body = (await res.json()) as { data: boolean };
    if (!body.data) throw new Error("Verification failed");
  });

  summary(3);
}

main().catch(console.error);
