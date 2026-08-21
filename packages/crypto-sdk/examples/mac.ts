// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Compute and verify HMAC-SHA256 message authentication codes.
 *
 * Run: `npx ts-node examples/mac.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";
import { header, task, taskWithOutput, summary } from "./support";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  header("crypto-sdk -- mac");

  const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const message = "Authenticate this message";

  await taskWithOutput("Compute HMAC-SHA256", async () => {
    const { data } = await client.mac({ algorithm: "hmac-sha256", key, data: message });
    return [`mac: ${data.mac.slice(0, 16)}...`, `algorithm: ${data.algorithm}`];
  });

  await task("Verify HMAC-SHA256 tag", async () => {
    const macTag = (await client.mac({ algorithm: "hmac-sha256", key, data: message })).data.mac;
    const { data } = await client.macVerify({ algorithm: "hmac-sha256", key, data: message, mac: macTag });
    if (!data.valid) {
      throw new Error("MAC verification failed");
    }
  });

  await task("Reject tampered message", async () => {
    const macTag = (await client.mac({ algorithm: "hmac-sha256", key, data: message })).data.mac;
    const { data } = await client.macVerify({ algorithm: "hmac-sha256", key, data: "tampered", mac: macTag });
    if (data.valid) {
      throw new Error("Tampered message should not verify");
    }
  });

  summary(3);
}

main().catch(console.error);
