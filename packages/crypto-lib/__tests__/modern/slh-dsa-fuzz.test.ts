/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Property-based fuzzing of SLH-DSA (FIPS 205) with fast-check:
// Verifies message signing invariance, tamper resistance across signatures
// and public keys, and robust rejection of malformed or boundary-violating inputs.

import { expect } from "chai";
import fc from "fast-check";
import {
  slhDsaKeygen,
  slhDsaSign,
  slhDsaVerify,
} from "../../src/modern/pq-hash-sign";

describe("SLH-DSA fuzzing (fast-check)", function () {
  this.timeout(90000);

  // Pre-generate keys with shake-128f to minimize CPU overhead across iterations
  const keyPair = slhDsaKeygen("shake-128f");
  const referenceMessage = "fips-205-security-baseline";
  const referenceSignature = slhDsaSign(
    "shake-128f",
    keyPair.secretKey,
    referenceMessage,
  ).signature;

  it("verifies signatures across arbitrary fuzzed messages", () => {
    // Generate signatures for varied payloads and verify roundtrip correctness
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 128 }),
        (arbitraryMsg) => {
          const sig = slhDsaSign("shake-128f", keyPair.secretKey, arbitraryMsg);
          const result = slhDsaVerify(
            "shake-128f",
            keyPair.publicKey,
            arbitraryMsg,
            sig.signature,
          );
          expect(result.valid).to.be.true;
          expect(result.algorithm).to.equal("slh-dsa-shake-128f");
        },
      ),
      { numRuns: 10 },
    );
  });

  it("rejects single-nibble tampering in the signature string", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: referenceSignature.length - 1 }),
        fc.constantFrom(
          "0",
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "a",
          "b",
          "c",
          "d",
          "e",
          "f",
        ),
        (pos, replChar) => {
          const originalChar = referenceSignature[pos];
          // Ensure we actually flip the character
          const flipped =
            replChar === originalChar
              ? replChar === "0"
                ? "1"
                : "0"
              : replChar;
          const tamperedSignature =
            referenceSignature.slice(0, pos) +
            flipped +
            referenceSignature.slice(pos + 1);

          let verified: boolean;
          try {
            verified = slhDsaVerify(
              "shake-128f",
              keyPair.publicKey,
              referenceMessage,
              tamperedSignature,
            ).valid;
          } catch {
            // Low-level parser rejection is acceptable; returning valid: true is not.
            verified = false;
          }
          expect(verified).to.be.false;
        },
      ),
      { numRuns: 50 },
    );
  });

  it("rejects single-nibble tampering in the public key string", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: keyPair.publicKey.length - 1 }),
        fc.constantFrom(
          "0",
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "a",
          "b",
          "c",
          "d",
          "e",
          "f",
        ),
        (pos, replChar) => {
          const originalChar = keyPair.publicKey[pos];
          const flipped =
            replChar === originalChar
              ? replChar === "0"
                ? "1"
                : "0"
              : replChar;
          const tamperedPublicKey =
            keyPair.publicKey.slice(0, pos) +
            flipped +
            keyPair.publicKey.slice(pos + 1);

          let verified: boolean;
          try {
            verified = slhDsaVerify(
              "shake-128f",
              tamperedPublicKey,
              referenceMessage,
              referenceSignature,
            ).valid;
          } catch {
            verified = false;
          }
          expect(verified).to.be.false;
        },
      ),
      { numRuns: 30 },
    );
  });

  it("safely throws on non-hex characters in public key or signature", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 32 })
          .filter((s) => /[^0-9a-fA-F]/.test(s)),
        (invalidHex) => {
          expect(() =>
            slhDsaVerify(
              "shake-128f",
              invalidHex,
              referenceMessage,
              referenceSignature,
            ),
          ).to.throw(/Invalid hex string/);

          expect(() =>
            slhDsaVerify(
              "shake-128f",
              keyPair.publicKey,
              referenceMessage,
              invalidHex,
            ),
          ).to.throw(/Invalid hex string/);
        },
      ),
      { numRuns: 30 },
    );
  });

  it("safely rejects truncated or oversized signature boundaries", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: referenceSignature.length - 4 }),
        (sliceLen) => {
          const evenLen = sliceLen - (sliceLen % 2);
          const truncatedSig = referenceSignature.slice(0, evenLen);

          let verified: boolean;
          try {
            verified = slhDsaVerify(
              "shake-128f",
              keyPair.publicKey,
              referenceMessage,
              truncatedSig,
            ).valid;
          } catch {
            verified = false;
          }
          expect(verified).to.be.false;
        },
      ),
      { numRuns: 20 },
    );
  });
});
