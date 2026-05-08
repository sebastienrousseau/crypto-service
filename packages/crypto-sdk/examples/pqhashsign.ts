// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Post-quantum hash-based signing with SLH-DSA (FIPS 205).
 *
 * Demonstrates key generation, signing, and verification using
 * the SHAKE-128f variant.
 *
 * Run: `npx ts-node examples/pqhashsign.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";
import { header, task, summary } from "./support";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  header("crypto-sdk -- pqhashsign");

  const variant = "shake-128f";
  const message = "Hash-based post-quantum authenticated message";

  const keys = await task("Generate SLH-DSA key pair", async () => {
    return client.pqHashSignKeygen({ variant });
  });

  const signed = await task("Sign message with SLH-DSA", async () => {
    return client.pqHashSign({
      variant,
      secretKey: keys.data.secretKey,
      message,
    });
  });

  await task("Verify SLH-DSA signature", async () => {
    const { data } = await client.pqHashVerify({
      variant,
      publicKey: keys.data.publicKey,
      message,
      signature: signed.data.signature,
    });
    if (!data.valid) {
      throw new Error("Signature verification failed");
    }
  });

  await task("Reject tampered message", async () => {
    const { data } = await client.pqHashVerify({
      variant,
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
