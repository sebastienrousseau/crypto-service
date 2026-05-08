// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Password-based encryption and decryption via POST /v2/password/encrypt
 * and POST /v2/password/decrypt.
 *
 * Uses Argon2id key derivation with XChaCha20-Poly1305 AEAD.
 *
 * Run: `npx ts-node examples/pwencrypt.ts`
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
  header("crypto-server -- pwencrypt");

  const password = "my-secret-password";
  const plaintext = "sensitive data";

  const ciphertext = await task("Encrypt with password", async () => {
    const res = await post("/v2/password/encrypt", { password, plaintext });
    const body = (await res.json()) as { data: string };
    return body.data;
  });

  await taskWithOutput("Decrypt with password", async () => {
    const res = await post("/v2/password/decrypt", { password, ciphertext });
    const body = (await res.json()) as { data: string };
    if (body.data !== plaintext) throw new Error("Mismatch");
    return [`plaintext: ${body.data}`];
  });

  await task("Verify wrong password fails", async () => {
    const res = await post("/v2/password/decrypt", {
      password: "wrong-password",
      ciphertext,
    });
    if (res.ok) throw new Error("Should have failed with wrong password");
  });

  summary(3);
}

main().catch(console.error);
