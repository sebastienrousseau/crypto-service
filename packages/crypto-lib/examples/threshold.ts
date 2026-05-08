// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Shamir Secret Sharing: split a secret into shares and reconstruct
 * from a threshold subset. Uses Feldman VSS for share verification.
 *
 * Run: `npx ts-node examples/threshold.ts`
 */

import { header, task, summary } from "./support";
import { protocols } from "../src";

const { splitSecret, combineShares, splitSecretWithCommitments, verifyFeldmanShare } =
  protocols.threshold;

async function main() {
  header("crypto-lib -- threshold");

  const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  const shares = await task("Split secret into 5 shares (threshold=3)", () => {
    return splitSecret(secret, 5, 3);
  });

  await task("Reconstruct from shares 1, 3, 5", () => {
    const subset = [shares.shares[0], shares.shares[2], shares.shares[4]];
    const recovered = combineShares(subset);
    if (recovered !== secret) throw new Error("Reconstruction failed");
  });

  await task("Feldman VSS: split with verifiable commitments", () => {
    const vss = splitSecretWithCommitments(secret, 5, 3);
    for (const share of vss.shares) {
      const valid = verifyFeldmanShare(share, vss.commitments);
      if (!valid) throw new Error(`Share ${share.index} failed verification`);
    }
  });

  summary(3);
}

main();
