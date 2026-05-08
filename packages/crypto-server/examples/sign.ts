// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Sign and verify a message via POST /v2/sign and POST /v2/verify.
 *
 * Generates an Ed25519 key pair via the keys endpoint, then signs and
 * verifies a message.
 *
 * Run: `npx ts-node examples/sign.ts`
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
  header("crypto-server -- sign");

  const keyPair = await task("Generate Ed25519 key pair", async () => {
    const res = await post("/v2/keys/generate", { algorithm: "ed25519" });
    const body = (await res.json()) as {
      data: { publicKey: string; privateKey: string };
    };
    return body.data;
  });

  const message = "Hello, crypto!";

  const signature = await task("Sign message with Ed25519", async () => {
    const res = await post("/v2/sign", {
      privateKey: keyPair.privateKey,
      message,
    });
    const body = (await res.json()) as { data: string };
    return body.data;
  });

  await task("Verify Ed25519 signature", async () => {
    const res = await post("/v2/verify", {
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
