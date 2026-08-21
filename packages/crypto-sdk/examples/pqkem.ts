// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Post-quantum hybrid key exchange (X25519 + ML-KEM).
 *
 * Demonstrates key generation, encapsulation, and decapsulation to
 * establish a shared secret between two parties.
 *
 * Run: `npx ts-node examples/pqkem.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { CryptoClient } from "../src";
import { header, task, summary } from "./support";

const client = new CryptoClient({
  baseUrl: process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000",
});

async function main() {
  header("crypto-sdk -- pqkem");

  const keys = await task("Generate hybrid X25519 + ML-KEM key pair", async () => {
    return client.pqGenerateKeyPair();
  });

  const encap = await task("Encapsulate shared secret", async () => {
    return client.pqEncapsulate({
      x25519PublicKey: keys.data.x25519PublicKey,
      mlKemPublicKey: keys.data.mlKemPublicKey,
    });
  });

  const decap = await task("Decapsulate shared secret", async () => {
    return client.pqDecapsulate({
      x25519PrivateKey: keys.data.x25519PrivateKey,
      mlKemSecretKey: keys.data.mlKemSecretKey,
      x25519EphemeralPublic: encap.data.x25519EphemeralPublic,
      mlKemCiphertext: encap.data.mlKemCiphertext,
    });
  });

  await task("Verify shared secrets match", async () => {
    if (encap.data.sharedSecret !== decap.data.sharedSecret) {
      throw new Error("Shared secrets do not match");
    }
  });

  summary(4);
}

main().catch(console.error);
