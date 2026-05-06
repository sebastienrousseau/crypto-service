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

const BASE = process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000";
const API_KEY = process.env.CRYPTO_API_KEY ?? "test-key";

async function main() {
  console.log("\n=== crypto-server — encrypt ===\n");

  // 256-bit key (64 hex chars)
  const key =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const plaintext = "Sensitive data to encrypt";

  // Encrypt
  const encRes = await fetch(`${BASE}/v2/encrypt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({ key, plaintext }),
  });
  const encData = await encRes.json();
  console.log("Ciphertext:", encData.data);

  // Decrypt
  const decRes = await fetch(`${BASE}/v2/decrypt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({ key, ciphertext: encData.data }),
  });
  const decData = await decRes.json();
  console.log("Decrypted:", decData.data.plaintext);

  console.log("\nDone.");
}

main().catch(console.error);
