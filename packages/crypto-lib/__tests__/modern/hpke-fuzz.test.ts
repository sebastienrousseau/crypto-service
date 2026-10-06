/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Property-based fuzzing of HPKE (RFC 9180) with fast-check:
// Encapsulation and opening must round-trip arbitrary plaintexts, info,
// and AAD parameters, while any tampering of ciphertext or encapsulated
// key must be rejected.

import { expect } from "chai";
import fc from "fast-check";
import { hpkeGenerateKeyPair, hpkeOpen, hpkeSeal } from "../../src/modern/hpke";

describe("HPKE fuzzing (fast-check)", () => {
  const recipient = hpkeGenerateKeyPair("x25519");
  const otherRecipient = hpkeGenerateKeyPair("x25519");

  it("round-trips arbitrary plaintexts, info, and aad contexts", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 256 }),
        fc.string({ minLength: 0, maxLength: 64 }),
        fc.string({ minLength: 0, maxLength: 64 }),
        (pt, info, aad) => {
          const ptHex = Buffer.from(pt, "utf8").toString("hex");
          const infoHex = Buffer.from(info, "utf8").toString("hex");
          const aadHex = Buffer.from(aad, "utf8").toString("hex");

          const sealed = hpkeSeal({
            recipientPublicKey: recipient.publicKey,
            plaintext: ptHex,
            info: infoHex,
            aad: aadHex,
          });

          const opened = hpkeOpen({
            recipientPrivateKey: recipient.privateKey,
            encapsulatedKey: sealed.encapsulatedKey,
            ciphertext: sealed.ciphertext,
            info: infoHex,
            aad: aadHex,
          });

          expect(
            Buffer.from(opened.plaintext, "hex").toString("utf8"),
          ).to.equal(pt);
        },
      ),
      { numRuns: 80 },
    );
  });

  it("rejects single-character tampering in ciphertext", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 128 }),
        fc.nat(),
        (pt, index) => {
          const ptHex = Buffer.from(pt, "utf8").toString("hex");
          const sealed = hpkeSeal({
            recipientPublicKey: recipient.publicKey,
            plaintext: ptHex,
          });

          const ctBytes = Buffer.from(sealed.ciphertext, "hex");
          const target = index % ctBytes.length;
          ctBytes[target] ^= 0x01; // flip 1 bit
          const tamperedHex = ctBytes.toString("hex");

          expect(() =>
            hpkeOpen({
              recipientPrivateKey: recipient.privateKey,
              encapsulatedKey: sealed.encapsulatedKey,
              ciphertext: tamperedHex,
            }),
          ).to.throw();
        },
      ),
      { numRuns: 80 },
    );
  });

  it("rejects single-character tampering in encapsulated key", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.nat(),
        (pt, index) => {
          const ptHex = Buffer.from(pt, "utf8").toString("hex");
          const sealed = hpkeSeal({
            recipientPublicKey: recipient.publicKey,
            plaintext: ptHex,
          });

          const encBytes = Buffer.from(sealed.encapsulatedKey, "hex");
          const target = index % encBytes.length;
          encBytes[target] ^= 0x01; // flip 1 bit
          const tamperedEnc = encBytes.toString("hex");

          expect(() =>
            hpkeOpen({
              recipientPrivateKey: recipient.privateKey,
              encapsulatedKey: tamperedEnc,
              ciphertext: sealed.ciphertext,
            }),
          ).to.throw();
        },
      ),
      { numRuns: 80 },
    );
  });

  it("fails to open when decrypting with a different recipient private key", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 64 }), (pt) => {
        const ptHex = Buffer.from(pt, "utf8").toString("hex");
        const sealed = hpkeSeal({
          recipientPublicKey: recipient.publicKey,
          plaintext: ptHex,
        });

        expect(() =>
          hpkeOpen({
            recipientPrivateKey: otherRecipient.privateKey,
            encapsulatedKey: sealed.encapsulatedKey,
            ciphertext: sealed.ciphertext,
          }),
        ).to.throw();
      }),
      { numRuns: 40 },
    );
  });
});
