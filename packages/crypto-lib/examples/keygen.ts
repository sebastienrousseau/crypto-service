// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Generate key pairs for various algorithms using the unified keygen API.
 *
 * Run: `npx ts-node examples/keygen.ts`
 */

import { header, task, taskWithOutput, summary } from "./support";
import { generateKeyPair } from "../src";
import type { KeyAlgorithm } from "../src";

async function main() {
  header("crypto-lib -- keygen");

  const algorithms: KeyAlgorithm[] = [
    "ed25519",
    "x25519",
    "p256",
    "ml-kem-768",
    "ml-dsa-65",
  ];

  for (const algo of algorithms) {
    await taskWithOutput(`Generate ${algo} key pair`, () => {
      const kp = generateKeyPair(algo, { use: algo.startsWith("ml-kem") ? "enc" : "sig" });
      return [
        `kid: ${kp.kid}`,
        `public:  ${kp.publicKey.slice(0, 40)}... (${kp.publicKey.length / 2} bytes)`,
        `private: ${kp.privateKey.slice(0, 40)}... (${kp.privateKey.length / 2} bytes)`,
      ];
    });
  }

  summary(algorithms.length);
}

main();
