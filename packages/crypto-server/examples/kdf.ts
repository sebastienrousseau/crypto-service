// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Key derivation via POST /v2/kdf.
 *
 * Demonstrates scrypt, HKDF-SHA256, and PBKDF2-SHA256 key derivation.
 *
 * Run: `npx ts-node examples/kdf.ts`
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
  header("crypto-server -- kdf");

  await task("Derive key with scrypt", async () => {
    const res = await post("/v2/kdf", {
      algorithm: "scrypt",
      password: "my-password",
      keyLength: 32,
      params: { N: 16384, r: 8, p: 1 },
    });
    const body = (await res.json()) as { data: unknown };
    if (!body.data) throw new Error("No derived key returned");
  });

  await task("Derive key with HKDF-SHA256", async () => {
    const res = await post("/v2/kdf", {
      algorithm: "hkdf-sha256",
      password: "input-key-material",
      keyLength: 32,
      params: { info: "application-context" },
    });
    const body = (await res.json()) as { data: unknown };
    if (!body.data) throw new Error("No derived key returned");
  });

  await task("Derive key with PBKDF2-SHA256", async () => {
    const res = await post("/v2/kdf", {
      algorithm: "pbkdf2-sha256",
      password: "my-password",
      keyLength: 32,
      params: { iterations: 100000 },
    });
    const body = (await res.json()) as { data: unknown };
    if (!body.data) throw new Error("No derived key returned");
  });

  summary(3);
}

main().catch(console.error);
