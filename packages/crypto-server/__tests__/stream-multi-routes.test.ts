// SPDX-License-Identifier: Apache-2.0 OR MIT
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { expect } from "chai";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";

describe("Multi-Recipient Post-Quantum Streaming Routes (v2)", function () {
  this.timeout(20000);

  let app: FastifyInstance;

  async function generateHybridKey(): Promise<{
    keyId: string;
    x25519PublicKey: string;
    mlKemPublicKey: string;
  }> {
    const res = await app.inject({
      method: "POST",
      url: "/v2/pq/hybrid/keygen",
      payload: {},
    });
    expect(res.statusCode).to.equal(200);
    return JSON.parse(res.payload).data;
  }

  before(async () => {
    app = await init();
  });

  after(async () => {
    await app.close();
  });

  describe("POST /v2/stream/multi-pq-encrypt and /v2/stream/multi-pq-decrypt", () => {
    it("encrypts for multiple recipients and allows each to decrypt independently", async () => {
      const aliceKey = await generateHybridKey();
      const bobKey = await generateHybridKey();

      const plaintext =
        "Top-secret quantum-resistant multi-recipient broadcast payload";

      const encRes = await app.inject({
        method: "POST",
        url: "/v2/stream/multi-pq-encrypt",
        payload: {
          recipients: [
            {
              recipientId: "alice-service",
              x25519PublicKey: aliceKey.x25519PublicKey,
              mlKemPublicKey: aliceKey.mlKemPublicKey,
            },
            {
              recipientId: "bob-service",
              x25519PublicKey: bobKey.x25519PublicKey,
              mlKemPublicKey: bobKey.mlKemPublicKey,
            },
          ],
          plaintext,
          chunkSize: 1024,
        },
      });

      expect(encRes.statusCode).to.equal(200, encRes.payload);
      const encData = JSON.parse(encRes.payload).data;
      expect(encData.algorithm).to.equal(
        "multi-x25519-ml-kem-768-xchacha20-poly1305-stream",
      );
      expect(encData.recipientCount).to.equal(2);
      expect(encData.ciphertext).to.be.a("string");

      // Decrypt as Alice with explicit recipientId
      const decAliceRes = await app.inject({
        method: "POST",
        url: "/v2/stream/multi-pq-decrypt",
        payload: {
          keyId: aliceKey.keyId,
          recipientId: "alice-service",
          ciphertext: encData.ciphertext,
        },
      });
      expect(decAliceRes.statusCode).to.equal(200);
      const decAliceData = JSON.parse(decAliceRes.payload).data;
      expect(decAliceData.plaintext).to.equal(plaintext);
      expect(decAliceData.recipientId).to.equal("alice-service");

      // Decrypt as Bob without explicit recipientId (auto-matching)
      const decBobRes = await app.inject({
        method: "POST",
        url: "/v2/stream/multi-pq-decrypt",
        payload: {
          keyId: bobKey.keyId,
          ciphertext: encData.ciphertext,
          chunkSize: 1024,
        },
      });
      expect(decBobRes.statusCode).to.equal(200);
      const decBobData = JSON.parse(decBobRes.payload).data;
      expect(decBobData.plaintext).to.equal(plaintext);
      expect(decBobData.recipientId).to.equal("bob-service");
    });

    it("rejects encryption with empty recipients list", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/multi-pq-encrypt",
        payload: {
          recipients: [],
          plaintext: "test payload",
        },
      });
      expect(res.statusCode).to.equal(400);
    });

    it("rejects encryption with invalid chunk size", async () => {
      const aliceKey = await generateHybridKey();
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/multi-pq-encrypt",
        payload: {
          recipients: [
            {
              recipientId: "alice",
              x25519PublicKey: aliceKey.x25519PublicKey,
              mlKemPublicKey: aliceKey.mlKemPublicKey,
            },
          ],
          plaintext: "test",
          chunkSize: 100, // minimum is 1024
        },
      });
      expect(res.statusCode).to.equal(400);
    });

    it("answers 404 when decrypting with an unknown keyId", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/multi-pq-decrypt",
        payload: {
          keyId: `k_${"Z".repeat(22)}`,
          ciphertext: "dGVzdA==",
        },
      });
      expect(res.statusCode).to.equal(404);
    });

    it("returns 400 when decrypting with wrong key or invalid ciphertext", async () => {
      const charlieKey = await generateHybridKey();
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/multi-pq-decrypt",
        payload: {
          keyId: charlieKey.keyId,
          ciphertext: Buffer.from("invalid-ciphertext-bytes").toString(
            "base64",
          ),
        },
      });
      expect(res.statusCode).to.equal(400);
    });

    it("handles encryption errors by returning structured error problem", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/multi-pq-encrypt",
        payload: {
          recipients: [
            {
              recipientId: "alice",
              x25519PublicKey: "00".repeat(32),
              mlKemPublicKey: "00".repeat(50), // invalid length
            },
          ],
          plaintext: "test",
        },
      });
      expect(res.statusCode).to.equal(400);
    });
  });

  describe("Authentication Enforcement on Multi-PQ Stream Endpoints", () => {
    let originalApiKey: string | undefined;

    before(() => {
      originalApiKey = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "prod-secret-multi-stream-key";
    });

    after(() => {
      if (originalApiKey !== undefined) {
        process.env["CRYPTO_API_KEY"] = originalApiKey;
      } else {
        delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("returns 401 on /v2/stream/multi-pq-encrypt without auth", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/multi-pq-encrypt",
        payload: {
          recipients: [
            {
              recipientId: "test",
              x25519PublicKey: "a".repeat(64),
              mlKemPublicKey: "b".repeat(64),
            },
          ],
          plaintext: "test",
        },
      });
      expect(res.statusCode).to.equal(401);
    });

    it("returns 401 on /v2/stream/multi-pq-decrypt without auth", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/stream/multi-pq-decrypt",
        payload: {
          keyId: `k_${"A".repeat(22)}`,
          ciphertext: "dGVzdA==",
        },
      });
      expect(res.statusCode).to.equal(401);
    });
  });
});
