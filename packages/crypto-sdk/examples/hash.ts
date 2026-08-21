// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Hash data using different algorithms via the Crypto SDK.
 *
 * Run: `npx ts-node examples/hash.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";
import { header, task, summary } from "./support";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  header("crypto-sdk -- hash");

  await task("Compute SHA-256 digest", async () => {
    const { data } = await client.hash({ algorithm: "sha256", data: "hello world" });
    return data.digest;
  });

  await task("Compute SHA-512 digest", async () => {
    const { data } = await client.hash({ algorithm: "sha512", data: "hello world" });
    return data.digest;
  });

  await task("Compute BLAKE2b-256 digest", async () => {
    const { data } = await client.hash({ algorithm: "blake2b-256", data: "hello world" });
    return data.digest;
  });

  summary(3);
}

main().catch(console.error);
