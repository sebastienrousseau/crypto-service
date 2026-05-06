// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * HMAC-SHA256: compute and verify message authentication codes.
 * Uses timing-safe comparison to prevent side-channel attacks.
 *
 * Run: `npx ts-node examples/hmac.ts`
 */

import { computeHmac, verifyHmac, crypto } from "../src";

function main() {
  console.log("\n=== crypto-lib — hmac ===\n");

  // Generate a random key
  const key = crypto.randomKey();
  const data = "Authenticate this message.";

  // Compute HMAC-SHA256
  const result = computeHmac({ algorithm: "sha256", key, data });
  console.log(`Algorithm: hmac-${result.algorithm}`);
  console.log(`MAC:       ${result.mac}`);

  // Verify (timing-safe)
  const { valid } = verifyHmac({ algorithm: "sha256", key, data, mac: result.mac });
  console.log(`Valid:     ${valid}`);

  // Verify with wrong data
  const { valid: wrong } = verifyHmac({
    algorithm: "sha256",
    key,
    data: "wrong data",
    mac: result.mac,
  });
  console.log(`Tampered:  ${wrong} (expected false)`);

  // Also available via the unified API
  const mac2 = crypto.hmac("sha256", key, data);
  const ok2 = crypto.hmacVerify("sha256", key, data, mac2);
  console.log(`\nUnified API match: ${ok2}`);

  // Other algorithms: sha384, sha512, sha3-256, sha3-512
  const sha3Mac = computeHmac({ algorithm: "sha3-256", key, data });
  console.log(`HMAC-SHA3-256: ${sha3Mac.mac.slice(0, 40)}...`);

  console.log("\nDone.");
}

main();
