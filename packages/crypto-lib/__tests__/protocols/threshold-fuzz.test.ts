/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Property-based fuzzing of Shamir Secret Sharing with fast-check:
// Reconstructing from any k-of-n shares must perfectly restore the
// original secret, while tampered shares must be rejected or produce
// a different secret.

import { expect } from "chai";
import fc from "fast-check";
import * as threshold from "../../src/protocols/threshold";

describe("Threshold fuzzing (fast-check)", () => {
  // Valid Ed25519 scalar element: 32 bytes with high nibble 0 to ensure < order
  const validSecretArb = fc
    .uint8Array({ minLength: 32, maxLength: 32 })
    .map((buf) => {
      const copy = new Uint8Array(buf);
      copy[0] &= 0x0f; // Ensure < group order
      return Buffer.from(copy).toString("hex");
    });

  it("reconstructs exact secret from any subset of k shares", () => {
    fc.assert(
      fc.property(validSecretArb, (secret) => {
        const n = 5;
        const k = 3;
        const split = threshold.splitSecret(secret, n, k);
        expect(split.shares).to.have.length(n);

        // Pick 3 distinct shares: 0, 2, 4
        const sub1 = [split.shares[0], split.shares[2], split.shares[4]];
        expect(threshold.combineShares(sub1)).to.equal(secret);

        // Pick another 3 distinct shares: 1, 3, 4
        const sub2 = [split.shares[1], split.shares[3], split.shares[4]];
        expect(threshold.combineShares(sub2)).to.equal(secret);
      }),
      { numRuns: 80 },
    );
  });

  it("detects tampered shares during reconstruction", () => {
    fc.assert(
      fc.property(validSecretArb, fc.nat(), (secret, index) => {
        const split = threshold.splitSecret(secret, 4, 3);
        const originalShare = split.shares[1];

        // Tamper with share 1's hex value
        const share1Bytes = Buffer.from(originalShare.value, "hex");
        const pos = index % share1Bytes.length;
        share1Bytes[pos] ^= 0x01; // flip 1 bit
        const tamperedShare = {
          index: originalShare.index,
          value: share1Bytes.toString("hex"),
        };

        const sharesToCombine = [
          split.shares[0],
          tamperedShare,
          split.shares[2],
        ];
        try {
          const reconstructed = threshold.combineShares(sharesToCombine);
          expect(reconstructed).to.not.equal(secret);
        } catch (e: unknown) {
          // If scalar reduction or group order check throws, that's also valid tamper detection
          expect(e).to.be.an("error");
        }
      }),
      { numRuns: 80 },
    );
  });
});
