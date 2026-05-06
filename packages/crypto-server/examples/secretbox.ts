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

const BASE = process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000";
const API_KEY = process.env.CRYPTO_API_KEY ?? "test-key";

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  console.log("\n=== crypto-server — secretbox ===\n");

  // 256-bit key as hex
  const key =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const plaintext = "Top secret message";

  // Seal
  const sealResult = await post("/v2/secretbox/seal", { key, plaintext });
  console.log("Sealed:", sealResult.data);

  // Open
  const openResult = await post("/v2/secretbox/open", {
    key,
    ciphertext: sealResult.data,
  });
  console.log("Opened:", openResult.data);

  // Seal with AAD
  const sealAad = await post("/v2/secretbox/seal", {
    key,
    plaintext,
    aad: "associated-data",
  });
  console.log("Sealed (AAD):", sealAad.data);

  const openAad = await post("/v2/secretbox/open", {
    key,
    ciphertext: sealAad.data,
    aad: "associated-data",
  });
  console.log("Opened (AAD):", openAad.data);

  console.log("\nDone.");
}

main().catch(console.error);
