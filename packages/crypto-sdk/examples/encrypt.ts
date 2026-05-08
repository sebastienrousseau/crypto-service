// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Encrypt and decrypt data with AES-256-GCM via the Crypto SDK.
 *
 * Run: `npx ts-node examples/encrypt.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";
import { header, task, summary } from "./support";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  header("crypto-sdk -- encrypt");

  const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const plaintext = "Sensitive message that must be encrypted";

  const encrypted = await task("Encrypt plaintext with AES-256-GCM", async () => {
    return client.encrypt({ key, plaintext });
  });

  await task("Decrypt ciphertext", async () => {
    const decrypted = await client.decrypt({ key, ciphertext: encrypted.data.ciphertext });
    if (decrypted.data.plaintext !== plaintext) {
      throw new Error("Round-trip mismatch");
    }
  });

  summary(2);
}

main().catch(console.error);
