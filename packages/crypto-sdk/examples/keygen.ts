// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Generate key pairs for multiple algorithms.
 *
 * Run: `npx ts-node examples/keygen.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import type { KeyAlgorithm } from "../src";
import { header, task, summary, createClient } from "./support";

const client = createClient();

async function main() {
  header("crypto-sdk -- keygen");

  // The server keeps each private key and returns its keyId.
  const algorithms: KeyAlgorithm[] = ["ed25519", "ed448", "p256", "p384"];

  for (const algorithm of algorithms) {
    await task(`Generate ${algorithm} key pair`, async () => {
      const { data } = await client.generateKeyPair({ algorithm });
      return data.keyId;
    });
  }

  await task("Generate default key pair (no algorithm)", async () => {
    const { data } = await client.generateKeyPair();
    return data.algorithm;
  });

  summary(algorithms.length + 1);
}

main().catch(console.error);
