// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Key derivation with HKDF-SHA256 via the Crypto SDK.
 *
 * Run: `npx ts-node examples/kdf.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";
import { header, task, taskWithOutput, summary } from "./support";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  header("crypto-sdk -- kdf");

  await taskWithOutput("Derive 256-bit key with HKDF-SHA256", async () => {
    const { data } = await client.kdf({
      algorithm: "hkdf-sha256",
      password: "my-secret-input-material",
      salt: "6578616d706c6553616c74",
      keyLength: 32,
    });
    return [
      `derivedKey: ${data.derivedKey.slice(0, 16)}...`,
      `salt: ${data.salt}`,
      `keyLength: ${data.keyLength} bytes`,
    ];
  });

  await taskWithOutput("Derive 512-bit key with HKDF-SHA256", async () => {
    const { data } = await client.kdf({
      algorithm: "hkdf-sha256",
      password: "another-secret-material",
      keyLength: 64,
    });
    return [
      `derivedKey: ${data.derivedKey.slice(0, 16)}...`,
      `keyLength: ${data.keyLength} bytes`,
    ];
  });

  await task("Verify deterministic derivation", async () => {
    const salt = "64657465726d696e6973746963";
    const a = await client.kdf({ algorithm: "hkdf-sha256", password: "same-input", salt, keyLength: 32 });
    const b = await client.kdf({ algorithm: "hkdf-sha256", password: "same-input", salt, keyLength: 32 });
    if (a.data.derivedKey !== b.data.derivedKey) {
      throw new Error("Deterministic derivation mismatch");
    }
  });

  summary(3);
}

main().catch(console.error);
