// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Post-quantum signing with ML-DSA (FIPS 204).
 *
 * Demonstrates key generation, signing, and verification at
 * security level 65 (ML-DSA-65).
 *
 * Run: `npx ts-node examples/pqsign.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";
import { header, task, summary } from "./support";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  header("crypto-sdk -- pqsign");

  const message = "Post-quantum authenticated message";

  const keys = await task("Generate ML-DSA-65 key pair", async () => {
    return client.pqSignKeygen({ level: 65 });
  });

  const signed = await task("Sign message with ML-DSA-65", async () => {
    return client.pqSign({
      level: 65,
      secretKey: keys.data.secretKey,
      message,
    });
  });

  await task("Verify ML-DSA-65 signature", async () => {
    const { data } = await client.pqVerify({
      level: 65,
      publicKey: keys.data.publicKey,
      message,
      signature: signed.data.signature,
    });
    if (!data.valid) {
      throw new Error("Signature verification failed");
    }
  });

  await task("Reject tampered message", async () => {
    const { data } = await client.pqVerify({
      level: 65,
      publicKey: keys.data.publicKey,
      message: "tampered message",
      signature: signed.data.signature,
    });
    if (data.valid) {
      throw new Error("Tampered message should not verify");
    }
  });

  summary(4);
}

main().catch(console.error);
