// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Secretbox seal and open via POST /v2/secretbox/seal and
 * POST /v2/secretbox/open.
 *
 * XChaCha20-Poly1305 symmetric encryption with optional AAD.
 *
 * Run: `npx ts-node examples/secretbox.ts`
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
  header("crypto-server -- secretbox");

  const key =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const plaintext = "Top secret message";

  const ciphertext = await task("Seal with secretbox", async () => {
    const res = await post("/v2/secretbox/seal", { key, plaintext });
    const body = (await res.json()) as { data: string };
    return body.data;
  });

  await task("Open secretbox", async () => {
    const res = await post("/v2/secretbox/open", { key, ciphertext });
    const body = (await res.json()) as { data: string };
    if (body.data !== plaintext) throw new Error("Mismatch");
  });

  const ciphertextAad = await task("Seal with secretbox (AAD)", async () => {
    const res = await post("/v2/secretbox/seal", { key, plaintext, aad: "associated-data" });
    const body = (await res.json()) as { data: string };
    return body.data;
  });

  await task("Open secretbox (AAD)", async () => {
    const res = await post("/v2/secretbox/open", {
      key,
      ciphertext: ciphertextAad,
      aad: "associated-data",
    });
    const body = (await res.json()) as { data: string };
    if (body.data !== plaintext) throw new Error("Mismatch");
  });

  summary(4);
}

main().catch(console.error);
