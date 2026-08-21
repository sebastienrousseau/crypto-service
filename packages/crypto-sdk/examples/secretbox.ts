// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Symmetric authenticated encryption with secretbox (seal / open).
 *
 * Run: `npx ts-node examples/secretbox.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";
import { header, task, summary } from "./support";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  header("crypto-sdk -- secretbox");

  const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const plaintext = "Top-secret information";

  const sealed = await task("Seal plaintext", async () => {
    return client.secretboxSeal({ key, plaintext });
  });

  await task("Seal plaintext with AAD", async () => {
    return client.secretboxSeal({ key, plaintext, aad: "context-metadata" });
  });

  await task("Open sealed ciphertext", async () => {
    const { data } = await client.secretboxOpen({ key, ciphertext: sealed.data.sealed });
    if (data.plaintext !== plaintext) {
      throw new Error("Round-trip mismatch");
    }
  });

  summary(3);
}

main().catch(console.error);
