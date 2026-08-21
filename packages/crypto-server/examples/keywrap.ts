// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Key wrapping and unwrapping via POST /v2/keys/wrap and
 * POST /v2/keys/unwrap.
 *
 * Uses AES-KW (RFC 3394) to securely wrap a key with a KEK.
 *
 * Run: `npx ts-node examples/keywrap.ts`
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
  header("crypto-server -- keywrap");

  const kek = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const keyToWrap = "abcdef0123456789abcdef0123456789";

  const wrappedKey = await task("Wrap key with AES-KW", async () => {
    const res = await post("/v2/keys/wrap", { kek, keyToWrap });
    const body = (await res.json()) as { data: string };
    return body.data;
  });

  await taskWithOutput("Unwrap key with AES-KW", async () => {
    const res = await post("/v2/keys/unwrap", { kek, wrappedKey });
    const body = (await res.json()) as { data: string };
    if (body.data !== keyToWrap) throw new Error("Unwrapped key mismatch");
    return [`original:  ${keyToWrap}`, `unwrapped: ${body.data}`];
  });

  const wrappedKwp = await task("Wrap key with AES-KWP", async () => {
    const res = await post("/v2/keys/wrap", {
      kek,
      keyToWrap,
      algorithm: "aes-kwp",
    });
    const body = (await res.json()) as { data: string };
    return body.data;
  });

  await taskWithOutput("Unwrap key with AES-KWP", async () => {
    const res = await post("/v2/keys/unwrap", {
      kek,
      wrappedKey: wrappedKwp,
      algorithm: "aes-kwp",
    });
    const body = (await res.json()) as { data: string };
    if (body.data !== keyToWrap) throw new Error("Unwrapped key mismatch");
    return [`algorithm: aes-kwp`, `valid: true`];
  });

  summary(4);
}

main().catch(console.error);
