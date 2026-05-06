// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Shamir Secret Sharing: split a secret into shares and reconstruct
 * from a threshold subset. Uses Feldman VSS for share verification.
 *
 * Run: `npx ts-node examples/threshold.ts`
 */

import { protocols } from "../src";

const { splitSecret, combineShares, splitSecretWithCommitments, verifyFeldmanShare } =
  protocols.threshold;

function main() {
  console.log("\n=== crypto-lib — threshold ===\n");

  // A 32-byte secret (hex-encoded)
  const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  console.log(`Original secret: ${secret.slice(0, 32)}...`);

  // Split into 5 shares with a threshold of 3
  const { shares, threshold } = splitSecret(secret, 5, 3);
  console.log(`\nSplit: 5 shares, threshold=${threshold}`);
  for (const s of shares) {
    console.log(`  Share ${s.index}: ${s.value.slice(0, 32)}...`);
  }

  // Reconstruct from any 3 shares
  const subset = [shares[0], shares[2], shares[4]];
  const recovered = combineShares(subset);
  console.log(`\nReconstructed (shares 1,3,5): ${recovered.slice(0, 32)}...`);
  console.log(`Match: ${recovered === secret}`);

  // Feldman VSS: split with verifiable commitments
  console.log("\n--- Feldman Verifiable Secret Sharing ---");
  const vss = splitSecretWithCommitments(secret, 5, 3);
  console.log(`Commitments: ${vss.commitments.commitments.length} points`);

  // Verify each share against the commitments
  for (const share of vss.shares) {
    const valid = verifyFeldmanShare(share, vss.commitments);
    console.log(`  Share ${share.index} valid: ${valid}`);
  }

  console.log("\nDone.");
}

main();
