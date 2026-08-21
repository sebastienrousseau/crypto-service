// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Encrypt and decrypt data via POST /v2/encrypt and POST /v2/decrypt.
 *
 * Uses XChaCha20-Poly1305 AEAD encryption with a 256-bit hex key.
 *
 * Run: `npx ts-node examples/encrypt.ts`
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
  header("crypto-server -- encrypt");

  const key =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const plaintext = "Sensitive data to encrypt";

  const ciphertext = await task("Encrypt with XChaCha20-Poly1305", async () => {
    const res = await post("/v2/encrypt", { key, plaintext });
    const body = (await res.json()) as { data: string };
    return body.data;
  });

  await task("Decrypt ciphertext", async () => {
    const res = await post("/v2/decrypt", { key, ciphertext });
    const body = (await res.json()) as { data: { plaintext: string } };
    if (body.data.plaintext !== plaintext) throw new Error("Mismatch");
  });

  summary(2);
}

main().catch(console.error);
