/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";

describe("HPKE Routes (/v2/hpke)", function () {
  this.timeout(60000);
  let app: FastifyInstance;

  before(async () => {
    app = await init();
  });

  after(async () => {
    await app.close();
  });

  describe("POST /v2/hpke/keygen", () => {
    it("generates post-quantum hybrid keypair by default with server custody", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hpke/keygen",
        payload: {},
      });
      expect(res.statusCode).to.equal(200);
      const data = JSON.parse(res.payload).data;
      expect(data).to.have.property("keyId");
      expect(data).to.have.property("publicKey");
      expect(data.algorithm).to.equal("x25519-ml-kem-768");
      expect(data.publicKey).to.be.a("string");
    });

    it("generates classical x25519 keypair", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hpke/keygen",
        payload: { kem: "x25519" },
      });
      expect(res.statusCode).to.equal(200);
      const data = JSON.parse(res.payload).data;
      expect(data.algorithm).to.equal("x25519");
      expect(data.publicKey).to.have.length(64);
    });

    it("generates classical p256 keypair", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hpke/keygen",
        payload: { kem: "p256" },
      });
      expect(res.statusCode).to.equal(200);
      const data = JSON.parse(res.payload).data;
      expect(data.algorithm).to.equal("p256");
      expect(data.publicKey).to.be.a("string");
    });
  });

  describe("POST /v2/hpke/seal and /v2/hpke/open", () => {
    it("round-trips post-quantum hybrid HPKE (x25519-ml-kem-768)", async () => {
      const keygenRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/keygen",
        payload: { kem: "x25519-ml-kem-768" },
      });
      const kp = JSON.parse(keygenRes.payload).data;

      const sealRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/seal",
        payload: {
          recipientPublicKey: kp.publicKey,
          plaintext: "Quantum-safe hybrid secret",
          kem: "x25519-ml-kem-768",
          aead: "chacha20-poly1305",
          info: "test-info",
          aad: "test-aad",
        },
      });
      expect(sealRes.statusCode).to.equal(200);
      const sealData = JSON.parse(sealRes.payload).data;
      expect(sealData).to.have.property("ciphertext");
      expect(sealData).to.have.property("encapsulatedKey");

      const openRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/open",
        payload: {
          keyId: kp.keyId,
          encapsulatedKey: sealData.encapsulatedKey,
          ciphertext: sealData.ciphertext,
          aead: "chacha20-poly1305",
          info: "test-info",
          aad: "test-aad",
        },
      });
      expect(openRes.statusCode).to.equal(200);
      const openData = JSON.parse(openRes.payload).data;
      expect(openData.plaintext).to.equal("Quantum-safe hybrid secret");
    });

    it("round-trips with AES-128-GCM AEAD and PSK mode", async () => {
      const keygenRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/keygen",
        payload: { kem: "x25519-ml-kem-768" },
      });
      const kp = JSON.parse(keygenRes.payload).data;
      const psk = Buffer.from("super-secret-psk-32-bytes-length!!").toString(
        "hex",
      );
      const pskId = Buffer.from("client-psk-id-123").toString("hex");

      const sealRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/seal",
        payload: {
          recipientPublicKey: kp.publicKey,
          plaintext: "Authenticated PSK message",
          kem: "x25519-ml-kem-768",
          aead: "aes-128-gcm",
          psk,
          pskId,
        },
      });
      expect(sealRes.statusCode).to.equal(200);
      const sealData = JSON.parse(sealRes.payload).data;

      const openRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/open",
        payload: {
          keyId: kp.keyId,
          encapsulatedKey: sealData.encapsulatedKey,
          ciphertext: sealData.ciphertext,
          aead: "aes-128-gcm",
          psk,
          pskId,
        },
      });
      expect(openRes.statusCode).to.equal(200);
      expect(JSON.parse(openRes.payload).data.plaintext).to.equal(
        "Authenticated PSK message",
      );
    });

    it("round-trips with minimal defaults and hex plaintext", async () => {
      const keygenRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/keygen",
        payload: {},
      });
      expect(keygenRes.statusCode).to.equal(200);
      const kp = JSON.parse(keygenRes.payload).data;

      // Plaintext is already valid hex
      const hexPlaintext = "deadbeefcafebabe";
      const sealRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/seal",
        payload: {
          recipientPublicKey: kp.publicKey,
          plaintext: hexPlaintext,
        },
      });
      expect(sealRes.statusCode).to.equal(200);
      const sealData = JSON.parse(sealRes.payload).data;

      const openRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/open",
        payload: {
          keyId: kp.keyId,
          encapsulatedKey: sealData.encapsulatedKey,
          ciphertext: sealData.ciphertext,
        },
      });
      expect(openRes.statusCode).to.equal(200);
      expect(JSON.parse(openRes.payload).data.hex).to.equal(hexPlaintext);
    });

    it("handles odd-length hex-like plaintext via utf-8 encoding", async () => {
      const keygenRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/keygen",
        payload: { kem: "x25519" },
      });
      const kp = JSON.parse(keygenRes.payload).data;

      const sealRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/seal",
        payload: {
          recipientPublicKey: kp.publicKey,
          plaintext: "abc",
          kem: "x25519",
          info: "01020304",
          aad: "05060708",
        },
      });
      expect(sealRes.statusCode).to.equal(200);
      const sealData = JSON.parse(sealRes.payload).data;

      const openRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/open",
        payload: {
          keyId: kp.keyId,
          encapsulatedKey: sealData.encapsulatedKey,
          ciphertext: sealData.ciphertext,
          info: "01020304",
          aad: "05060708",
        },
      });
      expect(openRes.statusCode).to.equal(200);
      expect(JSON.parse(openRes.payload).data.plaintext).to.equal("abc");
    });

    it("handles partial PSK fields gracefully without enabling PSK mode", async () => {
      const keygenRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/keygen",
        payload: { kem: "x25519" },
      });
      const kp = JSON.parse(keygenRes.payload).data;

      // psk without pskId
      const seal1 = await app.inject({
        method: "POST",
        url: "/v2/hpke/seal",
        payload: {
          recipientPublicKey: kp.publicKey,
          plaintext: "partial-psk-test",
          kem: "x25519",
          psk: "aabbcc",
        },
      });
      expect(seal1.statusCode).to.equal(200);
      const sealData1 = JSON.parse(seal1.payload).data;

      const open1 = await app.inject({
        method: "POST",
        url: "/v2/hpke/open",
        payload: {
          keyId: kp.keyId,
          encapsulatedKey: sealData1.encapsulatedKey,
          ciphertext: sealData1.ciphertext,
          psk: "aabbcc",
        },
      });
      expect(open1.statusCode).to.equal(200);

      // pskId without psk
      const seal2 = await app.inject({
        method: "POST",
        url: "/v2/hpke/seal",
        payload: {
          recipientPublicKey: kp.publicKey,
          plaintext: "partial-pskid-test",
          kem: "x25519",
          pskId: "my-id",
        },
      });
      expect(seal2.statusCode).to.equal(200);
      const sealData2 = JSON.parse(seal2.payload).data;

      const open2 = await app.inject({
        method: "POST",
        url: "/v2/hpke/open",
        payload: {
          keyId: kp.keyId,
          encapsulatedKey: sealData2.encapsulatedKey,
          ciphertext: sealData2.ciphertext,
          pskId: "my-id",
        },
      });
      expect(open2.statusCode).to.equal(200);
    });

    it("fails with 400 when seal recipient public key is invalid", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hpke/seal",
        payload: {
          recipientPublicKey: "invalid-key-data",
          plaintext: "hello",
        },
      });
      expect(res.statusCode).to.equal(400);
    });

    it("fails with 400 when open parameters or ciphertext are invalid", async () => {
      const keygenRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/keygen",
        payload: { kem: "x25519" },
      });
      const kp = JSON.parse(keygenRes.payload).data;

      const openRes = await app.inject({
        method: "POST",
        url: "/v2/hpke/open",
        payload: {
          keyId: kp.keyId,
          encapsulatedKey: "deadbeef",
          ciphertext: "cafebabe",
        },
      });
      expect(openRes.statusCode).to.equal(400);
    });
  });
});
