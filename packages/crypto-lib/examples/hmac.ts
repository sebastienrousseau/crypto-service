// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * HMAC-SHA256: compute and verify message authentication codes.
 * Uses timing-safe comparison to prevent side-channel attacks.
 *
 * Run: `npx ts-node examples/hmac.ts`
 */

import { header, task, summary } from "./support";
import { computeHmac, verifyHmac, crypto } from "../src";

async function main() {
  header("crypto-lib -- hmac");

  const key = crypto.randomKey();
  const data = "Authenticate this message.";

  const mac = await task("Compute HMAC-SHA256", () => {
    return computeHmac({ algorithm: "sha256", key, data });
  });

  await task("Verify valid MAC (timing-safe)", () => {
    const { valid } = verifyHmac({ algorithm: "sha256", key, data, mac: mac.mac });
    if (!valid) throw new Error("Verification failed");
  });

  await task("Reject tampered data", () => {
    const { valid } = verifyHmac({ algorithm: "sha256", key, data: "wrong", mac: mac.mac });
    if (valid) throw new Error("Should have rejected");
  });

  await task("Compute HMAC-SHA3-256", () => {
    computeHmac({ algorithm: "sha3-256", key, data });
  });

  summary(4);
}

main();
