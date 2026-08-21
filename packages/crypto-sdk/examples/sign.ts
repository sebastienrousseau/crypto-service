// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Generate a key pair, sign a message, and verify the signature.
 *
 * Run: `npx ts-node examples/sign.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";
import { header, task, summary } from "./support";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  header("crypto-sdk -- sign");

  const message = "This message is authentic";

  const keys = await task("Generate Ed25519 key pair", async () => {
    return client.generateKeyPair({ algorithm: "ed25519" });
  });

  const signed = await task("Sign message with Ed25519", async () => {
    return client.sign({
      privateKey: keys.data.privateKey,
      message,
    });
  });

  await task("Verify Ed25519 signature", async () => {
    const { data } = await client.verify({
      publicKey: keys.data.publicKey,
      message,
      signature: signed.data.signature,
    });
    if (!data.valid) {
      throw new Error("Signature verification failed");
    }
  });

  summary(3);
}

main().catch(console.error);
