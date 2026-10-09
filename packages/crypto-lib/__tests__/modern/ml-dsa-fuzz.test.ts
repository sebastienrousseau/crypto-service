/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Property-based fuzzing of ML-DSA (FIPS 204) with fast-check:
// Verifies message signing invariance, tamper resistance across signatures
// and public keys, boundary condition enforcement, and hybrid Ed25519+ML-DSA isolation.

import { expect } from "chai";
import fc from "fast-check";
import {
  mlDsaKeygen,
  mlDsaSign,
  mlDsaVerify,
  hybridSign,
  hybridVerify,
} from "../../src/modern/pq-sign";
import { generateEd25519KeyPair } from "../../src/modern/signing";

describe("ML-DSA fuzzing (fast-check)", function () {
  this.timeout(90000);

  const level44Key = mlDsaKeygen(44);
  const edKey = generateEd25519KeyPair();
  const baselineMessage = "fips-204-ml-dsa-security-baseline";
  const baselineSig44 = mlDsaSign(
    44,
    level44Key.secretKey,
    baselineMessage,
  ).signature;

  describe("arbitrary message roundtrip invariance", () => {
    it("roundtrips string payloads across arbitrary unicode content", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 256 }), (msg) => {
          const sig = mlDsaSign(44, level44Key.secretKey, msg);
          const verified = mlDsaVerify(
            44,
            level44Key.publicKey,
            msg,
            sig.signature,
          );
          expect(verified.valid).to.be.true;
          expect(verified.algorithm).to.equal("ml-dsa-44");
        }),
        { numRuns: 20 },
      );
    });

    it("roundtrips binary payloads across arbitrary byte arrays", () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 0, maxLength: 256 }),
          (bytes) => {
            const sig = mlDsaSign(44, level44Key.secretKey, bytes);
            const verified = mlDsaVerify(
              44,
              level44Key.publicKey,
              bytes,
              sig.signature,
            );
            expect(verified.valid).to.be.true;
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe("tamper resistance and boundaries", () => {
    it("rejects verification for any message differing from original", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 128 })
            .filter((m) => m !== baselineMessage),
          (tamperedMsg) => {
            const result = mlDsaVerify(
              44,
              level44Key.publicKey,
              tamperedMsg,
              baselineSig44,
            );
            expect(result.valid).to.be.false;
          },
        ),
        { numRuns: 30 },
      );
    });

    it("rejects single-nibble tampering in the signature string", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: baselineSig44.length - 1 }),
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
            const orig = baselineSig44[pos];
            const flipped =
              replChar === orig ? (replChar === "0" ? "1" : "0") : replChar;
            const tampered =
              baselineSig44.slice(0, pos) +
              flipped +
              baselineSig44.slice(pos + 1);

            let valid: boolean;
            try {
              valid = mlDsaVerify(
                44,
                level44Key.publicKey,
                baselineMessage,
                tampered,
              ).valid;
            } catch {
              valid = false;
            }
            expect(valid).to.be.false;
          },
        ),
        { numRuns: 30 },
      );
    });

    it("rejects truncated or extended signatures", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: baselineSig44.length - 2 }),
          (cutLen) => {
            const truncated = baselineSig44.slice(0, cutLen);
            let valid: boolean;
            try {
              valid = mlDsaVerify(
                44,
                level44Key.publicKey,
                baselineMessage,
                truncated,
              ).valid;
            } catch {
              valid = false;
            }
            expect(valid).to.be.false;
          },
        ),
        { numRuns: 20 },
      );
    });

    it("rejects non-hex garbage signatures gracefully", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 64 })
            .filter((s) => /[^0-9a-fA-F]/.test(s)),
          (garbage) => {
            let valid: boolean;
            try {
              valid = mlDsaVerify(
                44,
                level44Key.publicKey,
                baselineMessage,
                garbage,
              ).valid;
            } catch {
              valid = false;
            }
            expect(valid).to.be.false;
          },
        ),
        { numRuns: 20 },
      );
    });

    it("rejects single-nibble tampering in the public key string", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: level44Key.publicKey.length - 1 }),
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
            const orig = level44Key.publicKey[pos];
            const flipped =
              replChar === orig ? (replChar === "0" ? "1" : "0") : replChar;
            const tamperedPub =
              level44Key.publicKey.slice(0, pos) +
              flipped +
              level44Key.publicKey.slice(pos + 1);

            let valid: boolean;
            try {
              valid = mlDsaVerify(
                44,
                tamperedPub,
                baselineMessage,
                baselineSig44,
              ).valid;
            } catch {
              valid = false;
            }
            expect(valid).to.be.false;
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe("Hybrid Ed25519 + ML-DSA dual verification fuzzing", () => {
    const hybridSig = hybridSign(
      edKey.privateKey,
      level44Key.secretKey,
      baselineMessage,
      44,
    );

    it("validates roundtrip hybrid signature", () => {
      const res = hybridVerify(
        edKey.publicKey,
        level44Key.publicKey,
        baselineMessage,
        hybridSig.ed25519Signature,
        hybridSig.mlDsaSignature,
        44,
      );
      expect(res.valid).to.be.true;
      expect(res.algorithm).to.equal("ed25519-ml-dsa-44");
    });

    it("fails hybrid verification when Ed25519 component is fuzzed/tampered", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: hybridSig.ed25519Signature.length - 1 }),
          fc.constantFrom("0", "1", "a", "f"),
          (pos, char) => {
            const orig = hybridSig.ed25519Signature[pos];
            const flipped = char === orig ? (char === "0" ? "1" : "0") : char;
            const tamperedEd =
              hybridSig.ed25519Signature.slice(0, pos) +
              flipped +
              hybridSig.ed25519Signature.slice(pos + 1);

            let valid: boolean;
            try {
              valid = hybridVerify(
                edKey.publicKey,
                level44Key.publicKey,
                baselineMessage,
                tamperedEd,
                hybridSig.mlDsaSignature,
                44,
              ).valid;
            } catch {
              valid = false;
            }
            expect(valid).to.be.false;
          },
        ),
        { numRuns: 20 },
      );
    });

    it("fails hybrid verification when ML-DSA component is fuzzed/tampered", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: hybridSig.mlDsaSignature.length - 1 }),
          fc.constantFrom("0", "1", "a", "f"),
          (pos, char) => {
            const orig = hybridSig.mlDsaSignature[pos];
            const flipped = char === orig ? (char === "0" ? "1" : "0") : char;
            const tamperedMl =
              hybridSig.mlDsaSignature.slice(0, pos) +
              flipped +
              hybridSig.mlDsaSignature.slice(pos + 1);

            let valid: boolean;
            try {
              valid = hybridVerify(
                edKey.publicKey,
                level44Key.publicKey,
                baselineMessage,
                hybridSig.ed25519Signature,
                tamperedMl,
                44,
              ).valid;
            } catch {
              valid = false;
            }
            expect(valid).to.be.false;
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
