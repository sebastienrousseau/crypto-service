/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Property-based tests of ML-KEM (FIPS 203) through crypto-lib's API, now
// that it runs natively where it can: encapsulation and decapsulation agree
// at every level; any change to a ciphertext yields a different secret
// without an error (implicit rejection), the same one noble derives; and a
// secret never decapsulates under another key pair's secret key.
import { expect } from "chai";
import fc from "fast-check";
import {
  mlKemDecapsulate,
  mlKemEncapsulate,
  mlKemKeygen,
} from "../../src/modern/pq-kem";
import * as noble from "../accel/noble-pq";

const LEVELS = [512, 768, 1024] as const;
const flipBit = (hex: string, bit: number) => {
  const bytes = Buffer.from(hex, "hex");
  bytes[bit >> 3] = bytes[bit >> 3]! ^ (1 << (bit & 7));
  return bytes.toString("hex");
};

describe("ML-KEM properties (fast-check)", function () {
  this.timeout(120000);

  for (const level of LEVELS) {
    const kp = mlKemKeygen(level);
    const other = mlKemKeygen(level);

    it(`ML-KEM-${level}: decapsulation recovers every encapsulated secret`, () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1000 }), () => {
          const sent = mlKemEncapsulate(level, kp.publicKey);
          const got = mlKemDecapsulate(level, kp.secretKey, sent.ciphertext);
          expect(got.sharedSecret).to.equal(sent.sharedSecret);
        }),
        { numRuns: 25 },
      );
    });

    it(`ML-KEM-${level}: a changed ciphertext gives noble's rejection secret, without an error`, () => {
      const sent = mlKemEncapsulate(level, kp.publicKey);
      const bits = (sent.ciphertext.length / 2) * 8;
      fc.assert(
        fc.property(fc.integer({ min: 0, max: bits - 1 }), (bit) => {
          const changed = flipBit(sent.ciphertext, bit);
          const got = mlKemDecapsulate(level, kp.secretKey, changed);
          expect(got.sharedSecret).to.not.equal(sent.sharedSecret);
          const rejection = noble[`ml_kem${level}`].decapsulate(
            Buffer.from(changed, "hex"),
            Buffer.from(kp.secretKey, "hex"),
          );
          expect(got.sharedSecret).to.equal(
            Buffer.from(rejection).toString("hex"),
          );
        }),
        { numRuns: 40 },
      );
    });

    it(`ML-KEM-${level}: another key pair never recovers the secret`, () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1000 }), () => {
          const sent = mlKemEncapsulate(level, kp.publicKey);
          const got = mlKemDecapsulate(level, other.secretKey, sent.ciphertext);
          expect(got.sharedSecret).to.not.equal(sent.sharedSecret);
        }),
        { numRuns: 15 },
      );
    });
  }
});
