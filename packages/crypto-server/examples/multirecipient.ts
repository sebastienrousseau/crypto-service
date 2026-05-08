// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Multi-recipient encryption via POST /v2/multi-recipient/encrypt.
 *
 * Generates X25519 key pairs for two recipients and encrypts a
 * single plaintext so each recipient can decrypt independently.
 *
 * Run: `npx ts-node examples/multirecipient.ts`
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
  header("crypto-server -- multirecipient");

  const alice = await task("Generate X25519 key pair (Alice)", async () => {
    const res = await post("/v2/keys/generate", { algorithm: "x25519" });
    const body = (await res.json()) as {
      data: { publicKey: string; privateKey: string };
    };
    return body.data;
  });

  const bob = await task("Generate X25519 key pair (Bob)", async () => {
    const res = await post("/v2/keys/generate", { algorithm: "x25519" });
    const body = (await res.json()) as {
      data: { publicKey: string; privateKey: string };
    };
    return body.data;
  });

  const plaintext = "Confidential message for multiple recipients";

  await taskWithOutput("Encrypt for Alice and Bob", async () => {
    const res = await post("/v2/multi-recipient/encrypt", {
      plaintext,
      recipients: [
        { type: "classical", publicKey: alice.publicKey },
        { type: "classical", publicKey: bob.publicKey },
      ],
    });
    const body = (await res.json()) as { data: unknown };
    if (!body.data) throw new Error("Encryption failed");
    return [
      `recipients: 2`,
      `plaintext length: ${plaintext.length} chars`,
    ];
  });

  summary(3);
}

main().catch(console.error);
