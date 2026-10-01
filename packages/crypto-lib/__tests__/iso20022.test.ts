// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { expect } from "chai";
import {
  canonicalizePayload,
  computeIso20022Digest,
  signIso20022Payment,
  verifyIso20022Payment,
} from "../src/protocols/iso20022";
import { generateEd25519KeyPair } from "../src/modern/signing";
import { mlDsaKeygen } from "../src/modern/pq-sign";

describe("ISO 20022 Post-Quantum Dual-Signature Protocol", () => {
  const edKey = generateEd25519KeyPair();
  const mlKey65 = mlDsaKeygen(65);
  const mlKey44 = mlDsaKeygen(44);
  const trusted65 = {
    classicalPublicKeyHex: edKey.publicKey,
    postQuantumPublicKeyHex: mlKey65.publicKey,
  };

  describe("canonicalizePayload", () => {
    it("normalizes whitespace and newlines for string payloads", () => {
      const raw =
        "  <Document>\r\n  <GrpHdr>\r\n    <MsgId>123</MsgId>\r\n  </GrpHdr>\r\n</Document>  ";
      const canon = canonicalizePayload(raw);
      expect(canon).to.not.include("\r\n");
      expect(canon.startsWith("<Document>")).to.be.true;
      expect(canon.endsWith("</Document>")).to.be.true;
    });

    it("sorts keys recursively and handles arrays and primitives in JSON payloads", () => {
      const payload = {
        zeta: 1,
        alpha: "first",
        nested: {
          b: 2,
          a: [3, null, { y: 20, x: 10 }],
        },
      };
      const canon = canonicalizePayload(payload);
      expect(canon).to.equal(
        '{"alpha":"first","nested":{"a":[3,null,{"x":10,"y":20}],"b":2},"zeta":1}',
      );
    });

    it("handles primitives and null values safely", () => {
      expect(
        canonicalizePayload(null as unknown as Record<string, unknown>),
      ).to.equal("null");
    });
  });

  describe("computeIso20022Digest", () => {
    it("computes SHA-256 digest by default", () => {
      const digest = computeIso20022Digest({ id: 100 });
      expect(digest).to.be.a("string");
      expect(digest).to.have.length(64);
    });

    it("supports SHA-384 and SHA-512 algorithms", () => {
      const d384 = computeIso20022Digest("payload", "sha384");
      expect(d384).to.have.length(96);

      const d512 = computeIso20022Digest("payload", "sha512");
      expect(d512).to.have.length(128);
    });
  });

  describe("signIso20022Payment & verifyIso20022Payment", () => {
    const paymentPayload = {
      GrpHdr: {
        MsgId: "MSG-2026-0929-1001",
        CreDtTm: "2026-09-29T12:00:00Z",
        NbOfTxs: 1,
      },
      CdtTrfTxInf: {
        PmtId: {
          EndToEndId: "E2E-INST-99881",
        },
        Amt: {
          InstdAmt: 2500000.5,
          Ccy: "EUR",
        },
        CdtrAgt: {
          FinInstnId: { BICFI: "DEUTDEDDFXX" },
        },
      },
    };

    it("signs and verifies a valid pacs.008 dual-signature envelope with ML-DSA-65", () => {
      const envelope = signIso20022Payment({
        messageId: "MSG-2026-0929-1001",
        messageType: "pacs.008",
        payload: paymentPayload,
        classicalKey: {
          privateKeyHex: edKey.privateKey,
          publicKeyHex: edKey.publicKey,
        },
        postQuantumKey: {
          secretKeyHex: mlKey65.secretKey,
          publicKeyHex: mlKey65.publicKey,
          level: 65,
        },
      });

      expect(envelope.messageId).to.equal("MSG-2026-0929-1001");
      expect(envelope.messageType).to.equal("pacs.008");
      expect(envelope.classical.algorithm).to.equal("ed25519");
      expect(envelope.postQuantum.algorithm).to.equal("ml-dsa-65");

      const result = verifyIso20022Payment(envelope, paymentPayload, trusted65);
      expect(result.valid).to.be.true;
      expect(result.digestMatches).to.be.true;
      expect(result.classicalValid).to.be.true;
      expect(result.postQuantumValid).to.be.true;
      expect(result.messageId).to.equal("MSG-2026-0929-1001");
    });

    it("signs and verifies with ML-DSA-44 and default options", () => {
      const rawXml =
        "<pacs.008.001.10><GrpHdr><MsgId>XML-01</MsgId></GrpHdr></pacs.008.001.10>";
      const envelope = signIso20022Payment({
        messageId: "XML-01",
        payload: rawXml,
        classicalKey: {
          privateKeyHex: edKey.privateKey,
          publicKeyHex: edKey.publicKey,
        },
        postQuantumKey: {
          secretKeyHex: mlKey44.secretKey,
          publicKeyHex: mlKey44.publicKey,
          level: 44,
        },
      });

      expect(envelope.messageType).to.equal("generic");
      expect(envelope.postQuantum.algorithm).to.equal("ml-dsa-44");

      const result = verifyIso20022Payment(envelope, rawXml, {
        classicalPublicKeyHex: edKey.publicKey,
        postQuantumPublicKeyHex: mlKey44.publicKey,
      });
      expect(result.valid).to.be.true;
    });

    it("fails verification when payload is modified (digest mismatch)", () => {
      const envelope = signIso20022Payment({
        messageId: "MSG-TAMPER-01",
        payload: paymentPayload,
        classicalKey: {
          privateKeyHex: edKey.privateKey,
          publicKeyHex: edKey.publicKey,
        },
        postQuantumKey: {
          secretKeyHex: mlKey65.secretKey,
          publicKeyHex: mlKey65.publicKey,
        },
      });

      const tamperedPayload = {
        ...paymentPayload,
        CdtTrfTxInf: {
          ...paymentPayload.CdtTrfTxInf,
          Amt: { InstdAmt: 9999999.0, Ccy: "EUR" },
        },
      };

      const result = verifyIso20022Payment(
        envelope,
        tamperedPayload,
        trusted65,
      );
      expect(result.valid).to.be.false;
      expect(result.digestMatches).to.be.false;
    });

    it("fails verification when only the classical signature is invalid", () => {
      const envelope = signIso20022Payment({
        messageId: "MSG-BAD-CLASSIC",
        payload: paymentPayload,
        classicalKey: {
          privateKeyHex: edKey.privateKey,
          publicKeyHex: edKey.publicKey,
        },
        postQuantumKey: {
          secretKeyHex: mlKey65.secretKey,
          publicKeyHex: mlKey65.publicKey,
        },
      });
      const sig = Buffer.from(envelope.classical.signature, "hex");
      sig[0] = sig[0]! ^ 0x01;
      envelope.classical.signature = sig.toString("hex");

      const result = verifyIso20022Payment(envelope, paymentPayload, trusted65);
      expect(result.valid).to.be.false;
      expect(result.classicalValid).to.be.false;
      expect(result.postQuantumValid).to.be.true;
    });

    it("fails verification when only the post-quantum signature is invalid", () => {
      const envelope = signIso20022Payment({
        messageId: "MSG-BAD-PQ",
        payload: paymentPayload,
        classicalKey: {
          privateKeyHex: edKey.privateKey,
          publicKeyHex: edKey.publicKey,
        },
        postQuantumKey: {
          secretKeyHex: mlKey65.secretKey,
          publicKeyHex: mlKey65.publicKey,
        },
      });
      const sig = Buffer.from(envelope.postQuantum.signature, "hex");
      sig[10] = sig[10]! ^ 0x01;
      envelope.postQuantum.signature = sig.toString("hex");

      const result = verifyIso20022Payment(envelope, paymentPayload, trusted65);
      expect(result.valid).to.be.false;
      expect(result.classicalValid).to.be.true;
      expect(result.postQuantumValid).to.be.false;
    });

    it("fails both signatures when signed under a different public key than the trusted one", () => {
      const otherEdKey = generateEd25519KeyPair();
      const envelope = signIso20022Payment({
        messageId: "MSG-KEY-MISMATCH",
        payload: paymentPayload,
        classicalKey: {
          privateKeyHex: edKey.privateKey,
          publicKeyHex: otherEdKey.publicKey, // statement binds this key
        },
        postQuantumKey: {
          secretKeyHex: mlKey65.secretKey,
          publicKeyHex: mlKey65.publicKey,
        },
      });

      const result = verifyIso20022Payment(envelope, paymentPayload, trusted65);
      expect(result.valid).to.be.false;
      expect(result.classicalValid).to.be.false;
      expect(result.postQuantumValid).to.be.false;
    });

    it("handles invalid hex strings in signatures gracefully", () => {
      const envelope = signIso20022Payment({
        messageId: "MSG-HEX-ERR",
        payload: paymentPayload,
        classicalKey: {
          privateKeyHex: edKey.privateKey,
          publicKeyHex: edKey.publicKey,
        },
        postQuantumKey: {
          secretKeyHex: mlKey65.secretKey,
          publicKeyHex: mlKey65.publicKey,
        },
      });

      envelope.classical.signature = "invalid-hex-!";
      envelope.postQuantum.signature = "invalid-hex-!";

      const result = verifyIso20022Payment(envelope, paymentPayload, trusted65);
      expect(result.valid).to.be.false;
      expect(result.classicalValid).to.be.false;
      expect(result.postQuantumValid).to.be.false;
    });
  });
  describe("trusted-key binding (attacker-substituted envelopes)", () => {
    const original = { Amt: 100, Ccy: "EUR", Cdtr: "GB29NWBK60161331926819" };
    const trusted = {
      classicalPublicKeyHex: edKey.publicKey,
      postQuantumPublicKeyHex: mlKey65.publicKey,
    };
    const signGenuine = () =>
      signIso20022Payment({
        messageId: "E2E-TRUST-01",
        messageType: "pacs.008",
        payload: original,
        classicalKey: {
          privateKeyHex: edKey.privateKey,
          publicKeyHex: edKey.publicKey,
        },
        postQuantumKey: {
          secretKeyHex: mlKey65.secretKey,
          publicKeyHex: mlKey65.publicKey,
          level: 65,
        },
      });

    it("rejects an envelope re-signed end to end with attacker keys", () => {
      const attackerEd = generateEd25519KeyPair();
      const attackerMl = mlDsaKeygen(65);
      const forgedPayload = { ...original, Cdtr: "ATTACKER-IBAN" };
      const forged = signIso20022Payment({
        messageId: "E2E-TRUST-01",
        messageType: "pacs.008",
        payload: forgedPayload,
        classicalKey: {
          privateKeyHex: attackerEd.privateKey,
          publicKeyHex: attackerEd.publicKey,
        },
        postQuantumKey: {
          secretKeyHex: attackerMl.secretKey,
          publicKeyHex: attackerMl.publicKey,
          level: 65,
        },
      });

      const result = verifyIso20022Payment(forged, forgedPayload, trusted);
      expect(result.digestMatches).to.be.true;
      expect(result.classicalValid).to.be.false;
      expect(result.postQuantumValid).to.be.false;
      expect(result.valid).to.be.false;
    });

    it("ignores the public keys carried inside the envelope", () => {
      const envelope = signGenuine();
      envelope.classical.publicKey = generateEd25519KeyPair().publicKey;
      envelope.postQuantum.publicKey = mlDsaKeygen(65).publicKey;
      expect(verifyIso20022Payment(envelope, original, trusted).valid).to.be
        .true;
    });

    it("rejects a genuine envelope checked against other trusted keys", () => {
      const envelope = signGenuine();
      const result = verifyIso20022Payment(envelope, original, {
        classicalPublicKeyHex: generateEd25519KeyPair().publicKey,
        postQuantumPublicKeyHex: mlKey65.publicKey,
      });
      expect(result.classicalValid).to.be.false;
      // Both public keys are bound into the statement, so a different
      // trusted key also invalidates the ML-DSA signature.
      expect(result.postQuantumValid).to.be.false;
      expect(result.valid).to.be.false;
    });

    it("signs the timestamp", () => {
      const envelope = signGenuine();
      envelope.timestamp = "2001-01-01T00:00:00.000Z";
      const result = verifyIso20022Payment(envelope, original, trusted);
      expect(result.classicalValid).to.be.false;
      expect(result.postQuantumValid).to.be.false;
      expect(result.valid).to.be.false;
    });

    it("signs the digest algorithm identifier", () => {
      const envelope = signGenuine();
      envelope.digestAlgorithm = "sha512";
      envelope.payloadDigest = computeIso20022Digest(original, "sha512");
      const result = verifyIso20022Payment(envelope, original, trusted);
      expect(result.digestMatches).to.be.true;
      expect(result.valid).to.be.false;
    });

    it("does not let ':' in fields shift bytes between messageType and messageId", () => {
      // Under a ':'-joined statement "generic:A:B" can be re-split; a
      // length-prefixed encoding must not verify after the shift.
      const envelope = signIso20022Payment({
        messageId: "pacs.008:X",
        messageType: "generic",
        payload: original,
        classicalKey: {
          privateKeyHex: edKey.privateKey,
          publicKeyHex: edKey.publicKey,
        },
        postQuantumKey: {
          secretKeyHex: mlKey65.secretKey,
          publicKeyHex: mlKey65.publicKey,
        },
      });
      const shifted = {
        ...envelope,
        messageType: "generic:pacs.008" as unknown as "generic",
        messageId: "X",
      };
      expect(verifyIso20022Payment(shifted, original, trusted).valid).to.be
        .false;
    });

    it("rejects an unknown post-quantum algorithm identifier", () => {
      const envelope = signGenuine();
      (envelope.postQuantum as { algorithm: string }).algorithm = "ml-dsa-99";
      const result = verifyIso20022Payment(envelope, original, trusted);
      expect(result.postQuantumValid).to.be.false;
      expect(result.valid).to.be.false;
    });
  });
});
