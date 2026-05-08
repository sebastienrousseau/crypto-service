// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Generate key pairs for various algorithms via POST /v2/keys/generate.
 *
 * Demonstrates Ed25519, X25519, P-256, and ML-KEM-768 key generation.
 *
 * Run: `npx ts-node examples/keygen.ts`
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
  header("crypto-server -- keygen");

  const algorithms = ["ed25519", "x25519", "p256", "ml-kem-768"];

  for (const algorithm of algorithms) {
    await task(`Generate ${algorithm} key pair`, async () => {
      const res = await post("/v2/keys/generate", { algorithm });
      const body = (await res.json()) as { data: { publicKey: string } };
      if (!body.data.publicKey) throw new Error("No public key returned");
    });
  }

  await task("Generate Ed25519 key pair with metadata", async () => {
    const res = await post("/v2/keys/generate", {
      algorithm: "ed25519",
      metadata: { kid: "my-signing-key", use: "sig" },
    });
    const body = (await res.json()) as { data: { publicKey: string } };
    if (!body.data.publicKey) throw new Error("No public key returned");
  });

  summary(5);
}

main().catch(console.error);
