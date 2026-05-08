// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * SLH-DSA (FIPS 205) hash-based post-quantum signing workflow.
 *
 * Generates a SHAKE-128f key pair, signs a message, and verifies
 * the signature using the SLH-DSA stateless hash-based scheme.
 *
 * Run: `npx ts-node examples/pqhashsign.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { header, task, taskWithOutput, summary } from "./support";

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
  header("crypto-server -- pqhashsign");

  const variant = "shake-128f";

  const keyPair = await task("Generate SLH-DSA key pair (SHAKE-128f)", async () => {
    const res = await post("/v2/pq/slh-dsa/keygen", { variant });
    const body = (await res.json()) as {
      data: { publicKey: string; secretKey: string };
    };
    return body.data;
  });

  const message = "Hash-based post-quantum signatures are stateless!";

  const signature = await task("Sign message with SLH-DSA", async () => {
    const res = await post("/v2/pq/slh-dsa/sign", {
      variant,
      secretKey: keyPair.secretKey,
      message,
    });
    const body = (await res.json()) as { data: string };
    return body.data;
  });

  await taskWithOutput("Verify SLH-DSA signature", async () => {
    const res = await post("/v2/pq/slh-dsa/verify", {
      variant,
      publicKey: keyPair.publicKey,
      message,
      signature,
    });
    const body = (await res.json()) as { data: boolean };
    if (!body.data) throw new Error("Verification failed");
    return [`variant: ${variant}`, `valid: ${body.data}`];
  });

  summary(3);
}

main().catch(console.error);
