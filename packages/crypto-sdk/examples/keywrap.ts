// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Wrap and unwrap keys with AES-KW via the Crypto SDK.
 *
 * Run: `npx ts-node examples/keywrap.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";
import { header, task, taskWithOutput, summary } from "./support";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  header("crypto-sdk -- keywrap");

  const kek = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const keyToWrap = "00112233445566778899aabbccddeeff";

  await taskWithOutput("Wrap 128-bit key with AES-KW", async () => {
    const { data } = await client.keyWrap({ kek, keyToWrap, algorithm: "aes-kw" });
    return [`wrappedKey: ${data.wrappedKey.slice(0, 16)}...`];
  });

  await taskWithOutput("Unwrap key and verify round-trip", async () => {
    const wrappedKey = (await client.keyWrap({ kek, keyToWrap, algorithm: "aes-kw" })).data.wrappedKey;
    const { data } = await client.keyUnwrap({ kek, wrappedKey, algorithm: "aes-kw" });
    if (data.key !== keyToWrap) {
      throw new Error("Round-trip mismatch");
    }
    return [`recovered: ${data.key}`];
  });

  await task("Reject unwrap with wrong KEK", async () => {
    const wrappedKey = (await client.keyWrap({ kek, keyToWrap, algorithm: "aes-kw" })).data.wrappedKey;
    const wrongKek = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    let unwrapped = false;
    try {
      await client.keyUnwrap({ kek: wrongKek, wrappedKey, algorithm: "aes-kw" });
      unwrapped = true;
    } catch {
      /* expected failure */
    }
    if (unwrapped) {
      throw new Error("Should have rejected wrong KEK");
    }
  });

  summary(3);
}

main().catch(console.error);
