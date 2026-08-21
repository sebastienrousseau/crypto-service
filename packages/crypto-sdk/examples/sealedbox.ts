// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Anonymous public-key encryption with sealed box (seal / open).
 *
 * Run: `npx ts-node examples/sealedbox.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";
import { header, task, taskWithOutput, summary } from "./support";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  header("crypto-sdk -- sealedbox");

  const keys = await task("Generate X25519 key pair", async () => {
    return client.generateKeyPair({ algorithm: "x25519" });
  });

  const sealed = await task("Seal plaintext to recipient public key", async () => {
    return client.sealedboxSeal({
      recipientPublicKey: keys.data.publicKey,
      plaintext: "Eyes-only message for the recipient",
    });
  });

  await taskWithOutput("Open sealed box with secret key", async () => {
    const { data } = await client.sealedboxOpen({
      recipientSecretKey: keys.data.privateKey,
      sealed: sealed.data.sealed,
    });
    if (data.plaintext !== "Eyes-only message for the recipient") {
      throw new Error("Round-trip mismatch");
    }
    return [`plaintext: ${data.plaintext}`];
  });

  summary(3);
}

main().catch(console.error);
