// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Generate key pairs for various algorithms using the unified keygen API.
 *
 * Run: `npx ts-node examples/keygen.ts`
 */

import { generateKeyPair, KEY_ALGORITHMS } from "../src";
import type { KeyAlgorithm } from "../src";

function main() {
  console.log("\n=== crypto-lib — keygen ===\n");

  // Generate a key pair for each supported algorithm
  const algorithms: KeyAlgorithm[] = [
    "ed25519",
    "x25519",
    "p256",
    "ml-kem-768",
    "ml-dsa-65",
  ];

  for (const algo of algorithms) {
    const kp = generateKeyPair(algo, { use: algo.startsWith("ml-kem") ? "enc" : "sig" });
    console.log(`${kp.algorithm}`);
    console.log(`  kid:        ${kp.kid}`);
    console.log(`  public key: ${kp.publicKey.slice(0, 40)}... (${kp.publicKey.length / 2} bytes)`);
    console.log(`  private:    ${kp.privateKey.slice(0, 40)}... (${kp.privateKey.length / 2} bytes)`);
    console.log();
  }

  console.log(`All supported algorithms: ${KEY_ALGORITHMS.join(", ")}`);

  console.log("\nDone.");
}

main();
