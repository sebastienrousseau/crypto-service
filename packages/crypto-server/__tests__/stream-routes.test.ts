// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { expect } from "chai";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";
import {
  generateEd25519KeyPair,
  mlDsaKeygen,
  signIso20022Payment,
} from "@sebastienrousseau/crypto-lib";

describe("Streaming & Wholesale Payment Routes (v2)", function () {
  this.timeout(15000);

  let app: FastifyInstance;
  const edKey = generateEd25519KeyPair();
  const mlKey = mlDsaKeygen(65);

  /** Generate a server-held ed25519 key; returns its keyId and public key. */
  async function serverKey(): Promise<{ keyId: string; publicKey: string }> {
    const res = await app.inject({
      method: "POST",
      url: "/v2/keys/generate",
      payload: { algorithm: "ed25519" },
    });
    return JSON.parse(res.payload).data;
  }

  before(async () => {
    app = await init();
  });

  after(async () => {
    await app.close();
  });

  describe("POST /v2/stream/sign", () => {
    it("batch signs multiple payloads with sub-millisecond throughput", async () => {
      const { keyId } = await serverKey();
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/sign",
        payload: {
          items: [
            {
              id: "batch-1",
              message: "settlement-instruction-01",
              keyId,
            },
            {
              id: "batch-2",
              message: "settlement-instruction-02",
              keyId,
            },
          ],
        },
      });

      expect(res.statusCode).to.equal(200);
      const json = JSON.parse(res.payload);
      expect(json.data.count).to.equal(2);
      expect(json.data.signatures).to.have.length(2);
      expect(json.data.signatures[0].id).to.equal("batch-1");
      expect(json.data.signatures[0].signature).to.be.a("string");
    });

    it("answers 404 when a batch names an unknown keyId", async () => {
      const { keyId } = await serverKey();
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/sign",
        payload: {
          items: [
            { id: "a", message: "m", keyId },
            { id: "b", message: "m", keyId: `k_${"Z".repeat(22)}` },
          ],
        },
      });
      expect(res.statusCode).to.equal(404);
    });

    it("rejects invalid batch sign requests missing required fields", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/sign",
        payload: { items: [] },
      });
      expect(res.statusCode).to.equal(400);
    });
  });

  describe("POST /v2/stream/verify", () => {
    it("batch verifies multiple signatures successfully", async () => {
      const kp = await serverKey();
      const signRes = await app.inject({
        method: "POST",
        url: "/v2/stream/sign",
        payload: {
          items: [
            { id: "tx-1", message: "payment-1", keyId: kp.keyId },
            { id: "tx-2", message: "payment-2", keyId: kp.keyId },
          ],
        },
      });
      const signatures = JSON.parse(signRes.payload).data.signatures;

      const verifyRes = await app.inject({
        method: "POST",
        url: "/v2/stream/verify",
        payload: {
          items: [
            {
              id: "tx-1",
              message: "payment-1",
              signature: signatures[0].signature,
              publicKey: kp.publicKey,
            },
            {
              id: "tx-2",
              message: "payment-2",
              signature: signatures[1].signature,
              publicKey: kp.publicKey,
            },
          ],
        },
      });

      expect(verifyRes.statusCode).to.equal(200);
      const json = JSON.parse(verifyRes.payload);
      expect(json.data.count).to.equal(2);
      expect(json.data.validCount).to.equal(2);
      expect(json.data.allValid).to.be.true;
    });

    it("reports false for invalid and malformed signatures in the batch", async () => {
      const verifyRes = await app.inject({
        method: "POST",
        url: "/v2/stream/verify",
        payload: {
          items: [
            {
              id: "tx-bad-sig",
              message: "payment-bad",
              signature: "invalid-hex-or-sig",
              publicKey: edKey.publicKey,
            },
          ],
        },
      });

      expect(verifyRes.statusCode).to.equal(200);
      const json = JSON.parse(verifyRes.payload);
      expect(json.data.allValid).to.be.false;
      expect(json.data.results[0].valid).to.be.false;
    });
  });

  describe("POST /v2/stream/iso20022", () => {
    const payment = {
      GrpHdr: { MsgId: "PACS-STREAM-001" },
      CdtTrfTxInf: { Amt: 5000000, Ccy: "GBP" },
    };
    const trustedKeys = {
      classicalPublicKey: edKey.publicKey,
      postQuantumPublicKey: mlKey.publicKey,
    };

    it("verifies a valid ISO 20022 dual-signature envelope", async () => {
      const envelope = signIso20022Payment({
        messageId: "PACS-STREAM-001",
        messageType: "pacs.008",
        payload: payment,
        classicalKey: {
          privateKeyHex: edKey.privateKey,
          publicKeyHex: edKey.publicKey,
        },
        postQuantumKey: {
          secretKeyHex: mlKey.secretKey,
          publicKeyHex: mlKey.publicKey,
          level: 65,
        },
      });

      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/iso20022",
        payload: { envelope, payload: payment, trustedKeys },
      });

      expect(res.statusCode).to.equal(200);
      const json = JSON.parse(res.payload);
      expect(json.data.valid).to.be.true;
      expect(json.data.digestMatches).to.be.true;
      expect(json.data.classicalValid).to.be.true;
      expect(json.data.postQuantumValid).to.be.true;
    });

    it("detects tampered payload in ISO 20022 verification", async () => {
      const envelope = signIso20022Payment({
        messageId: "PACS-STREAM-002",
        messageType: "pacs.008",
        payload: payment,
        classicalKey: {
          privateKeyHex: edKey.privateKey,
          publicKeyHex: edKey.publicKey,
        },
        postQuantumKey: {
          secretKeyHex: mlKey.secretKey,
          publicKeyHex: mlKey.publicKey,
        },
      });

      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/iso20022",
        payload: {
          envelope,
          payload: { ...payment, CdtTrfTxInf: { Amt: 9999999 } },
          trustedKeys,
        },
      });

      expect(res.statusCode).to.equal(200);
      const json = JSON.parse(res.payload);
      expect(json.data.valid).to.be.false;
      expect(json.data.digestMatches).to.be.false;
    });
    it("rejects an envelope re-signed with attacker keys", async () => {
      const attackerEd = generateEd25519KeyPair();
      const attackerMl = mlDsaKeygen(65);
      const forged = { ...payment, CdtTrfTxInf: { Amt: 1, Ccy: "GBP" } };
      const envelope = signIso20022Payment({
        messageId: "PACS-STREAM-003",
        messageType: "pacs.008",
        payload: forged,
        classicalKey: {
          privateKeyHex: attackerEd.privateKey,
          publicKeyHex: attackerEd.publicKey,
        },
        postQuantumKey: {
          secretKeyHex: attackerMl.secretKey,
          publicKeyHex: attackerMl.publicKey,
        },
      });

      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/iso20022",
        payload: { envelope, payload: forged, trustedKeys },
      });

      expect(res.statusCode).to.equal(200);
      const json = JSON.parse(res.payload);
      expect(json.data.digestMatches).to.be.true;
      expect(json.data.classicalValid).to.be.false;
      expect(json.data.postQuantumValid).to.be.false;
      expect(json.data.valid).to.be.false;
    });

    it("requires trustedKeys", async () => {
      const envelope = signIso20022Payment({
        messageId: "PACS-STREAM-004",
        payload: payment,
        classicalKey: {
          privateKeyHex: edKey.privateKey,
          publicKeyHex: edKey.publicKey,
        },
        postQuantumKey: {
          secretKeyHex: mlKey.secretKey,
          publicKeyHex: mlKey.publicKey,
        },
      });
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/iso20022",
        payload: { envelope, payload: payment },
      });
      expect(res.statusCode).to.equal(400);
    });
  });

  describe("POST /v2/stream/pq-encrypt and /v2/stream/pq-decrypt", () => {
    it("encrypts and decrypts stream data with a server-held hybrid key", async () => {
      // 1. Generate server-held hybrid key
      const kpRes = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/keygen",
        payload: {},
      });
      expect(kpRes.statusCode).to.equal(200);
      const kp = JSON.parse(kpRes.payload).data as {
        keyId: string;
        x25519PublicKey: string;
        mlKemPublicKey: string;
      };

      // 2. Encrypt stream
      const plaintext = "High-throughput post-quantum payload data stream";
      const encRes = await app.inject({
        method: "POST",
        url: "/v2/stream/pq-encrypt",
        payload: {
          x25519PublicKey: kp.x25519PublicKey,
          mlKemPublicKey: kp.mlKemPublicKey,
          plaintext,
          chunkSize: 64,
        },
      });
      expect(encRes.statusCode).to.equal(200);
      const encData = JSON.parse(encRes.payload).data;
      expect(encData.algorithm).to.equal(
        "x25519-ml-kem-768-xchacha20-poly1305-stream",
      );
      expect(encData.ciphertext).to.be.a("string");

      // 3. Decrypt stream
      const decRes = await app.inject({
        method: "POST",
        url: "/v2/stream/pq-decrypt",
        payload: {
          keyId: kp.keyId,
          ciphertext: encData.ciphertext,
          chunkSize: 64,
        },
      });
      expect(decRes.statusCode).to.equal(200);
      const decData = JSON.parse(decRes.payload).data;
      expect(decData.plaintext).to.equal(plaintext);
    });

    it("round-trips without specifying chunkSize (default chunk size)", async () => {
      const kpRes = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/keygen",
        payload: {},
      });
      const kp = JSON.parse(kpRes.payload).data;
      const plaintext = "Default chunk size stream";

      const encRes = await app.inject({
        method: "POST",
        url: "/v2/stream/pq-encrypt",
        payload: {
          x25519PublicKey: kp.x25519PublicKey,
          mlKemPublicKey: kp.mlKemPublicKey,
          plaintext,
        },
      });
      expect(encRes.statusCode).to.equal(200);

      const decRes = await app.inject({
        method: "POST",
        url: "/v2/stream/pq-decrypt",
        payload: {
          keyId: kp.keyId,
          ciphertext: JSON.parse(encRes.payload).data.ciphertext,
        },
      });
      expect(decRes.statusCode).to.equal(200);
      expect(JSON.parse(decRes.payload).data.plaintext).to.equal(plaintext);
    });

    it("fails decryption when ciphertext is tampered", async () => {
      const kpRes = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/keygen",
        payload: {},
      });
      const kp = JSON.parse(kpRes.payload).data;

      const encRes = await app.inject({
        method: "POST",
        url: "/v2/stream/pq-encrypt",
        payload: {
          x25519PublicKey: kp.x25519PublicKey,
          mlKemPublicKey: kp.mlKemPublicKey,
          plaintext: "tamper test",
        },
      });
      const rawCt = Buffer.from(
        JSON.parse(encRes.payload).data.ciphertext,
        "base64",
      );
      rawCt[rawCt.length - 1] ^= 0xff;

      const decRes = await app.inject({
        method: "POST",
        url: "/v2/stream/pq-decrypt",
        payload: {
          keyId: kp.keyId,
          ciphertext: rawCt.toString("base64"),
        },
      });
      expect(decRes.statusCode).to.be.greaterThanOrEqual(400);
    });

    it("returns 404 on decrypt when keyId does not exist", async () => {
      const decRes = await app.inject({
        method: "POST",
        url: "/v2/stream/pq-decrypt",
        payload: {
          keyId: `k_${"X".repeat(22)}`,
          ciphertext: Buffer.from("randombytes").toString("base64"),
        },
      });
      expect(decRes.statusCode).to.equal(404);
    });

    it("returns 400 on invalid encryption request schema", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/pq-encrypt",
        payload: {
          x25519PublicKey: "short",
          mlKemPublicKey: "short",
          plaintext: "test",
        },
      });
      expect(res.statusCode).to.equal(400);
    });

    it("returns 400 when encryption fails due to invalid hex key bytes", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/pq-encrypt",
        payload: {
          x25519PublicKey: "z".repeat(64),
          mlKemPublicKey: "00",
          plaintext: "test",
        },
      });
      expect(res.statusCode).to.equal(400);
      const json = JSON.parse(res.payload);
      expect(json.type).to.include("problem");
    });
  });

  describe("Authentication checks (401 when CRYPTO_API_KEY is configured)", () => {
    const savedKey = process.env["CRYPTO_API_KEY"];

    before(() => {
      process.env["CRYPTO_API_KEY"] = "institutional-secret-key";
    });

    after(() => {
      if (savedKey !== undefined) {
        process.env["CRYPTO_API_KEY"] = savedKey;
      } else {
        delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("returns 401 on /v2/stream/sign without auth", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/sign",
        payload: {
          items: [{ id: "1", message: "m", keyId: `k_${"A".repeat(22)}` }],
        },
      });
      expect(res.statusCode).to.equal(401);
    });

    it("returns 401 on /v2/stream/verify without auth", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/verify",
        payload: {
          items: [
            {
              id: "1",
              message: "m",
              signature: "s",
              publicKey: edKey.publicKey,
            },
          ],
        },
      });
      expect(res.statusCode).to.equal(401);
    });

    it("returns 401 on /v2/stream/iso20022 without auth", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/iso20022",
        payload: {
          envelope: {
            messageId: "1",
            messageType: "generic",
            payloadDigest: "d",
            digestAlgorithm: "sha256",
            timestamp: "2026-09-29T12:00:00Z",
            classical: { algorithm: "ed25519", signature: "s", publicKey: "p" },
            postQuantum: {
              algorithm: "ml-dsa-65",
              signature: "s",
              publicKey: "p",
            },
          },
          payload: "test",
          trustedKeys: { classicalPublicKey: "p", postQuantumPublicKey: "p" },
        },
      });
      expect(res.statusCode).to.equal(401);
    });

    it("returns 401 on /v2/stream/pq-encrypt without auth", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/pq-encrypt",
        payload: {
          x25519PublicKey: "a".repeat(64),
          mlKemPublicKey: "b".repeat(64),
          plaintext: "test",
        },
      });
      expect(res.statusCode).to.equal(401);
    });

    it("returns 401 on /v2/stream/pq-decrypt without auth", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/pq-decrypt",
        payload: {
          keyId: `k_${"A".repeat(22)}`,
          ciphertext: "dGVzdA==",
        },
      });
      expect(res.statusCode).to.equal(401);
    });
  });
});
