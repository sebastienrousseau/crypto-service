/**
 * Tests for routes/v2/pq.ts — ML-KEM and hybrid PQ key exchange routes.
 *
 * Covers the full lifecycle of all 6 PQ endpoints plus error paths
 * (catch blocks returning 500) and the rejectUnauthorized guard.
 */
import { expect } from "chai";
import { init } from "../src/server";
import type { FastifyInstance } from "fastify";

describe("PQ Routes (v2)", function () {
  this.timeout(30000);

  let app: FastifyInstance;
  const origApiKey = process.env["CRYPTO_API_KEY"];

  before(async () => {
    // Ensure no API key is required for success-path tests
    delete process.env["CRYPTO_API_KEY"];
    app = await init();
  });

  after(async () => {
    await app.close();
    if (origApiKey !== undefined) process.env["CRYPTO_API_KEY"] = origApiKey;
    else delete process.env["CRYPTO_API_KEY"];
  });

  // ---------------------------------------------------------------
  // ML-KEM standalone
  // ---------------------------------------------------------------
  describe("POST /v2/pq/keygen", () => {
    it("should generate an ML-KEM-768 key pair", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/keygen",
        payload: {},
      });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.data).to.have.property("publicKey");
      expect(body.data).to.have.property("secretKey");
      expect(body.data.algorithm).to.equal("ml-kem-768");
    });
  });

  describe("POST /v2/pq/encapsulate", () => {
    it("should encapsulate using a valid public key", async () => {
      // First generate a key pair
      const genRes = await app.inject({
        method: "POST",
        url: "/v2/pq/keygen",
        payload: {},
      });
      const { publicKey } = JSON.parse(genRes.payload).data;

      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/encapsulate",
        payload: { publicKey },
      });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.data).to.have.property("ciphertext");
      expect(body.data).to.have.property("sharedSecret");
      expect(body.data.algorithm).to.equal("ml-kem-768");
    });

    it("should return 500 for an invalid public key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/encapsulate",
        payload: { publicKey: "deadbeef" },
      });
      expect(res.statusCode).to.equal(500);
      const body = JSON.parse(res.payload);
      expect(body.error).to.equal("Encapsulation failed");
    });
  });

  describe("POST /v2/pq/decapsulate", () => {
    it("should decapsulate and recover the shared secret", async () => {
      // Generate key pair
      const genRes = await app.inject({
        method: "POST",
        url: "/v2/pq/keygen",
        payload: {},
      });
      const { publicKey, secretKey } = JSON.parse(genRes.payload).data;

      // Encapsulate
      const encRes = await app.inject({
        method: "POST",
        url: "/v2/pq/encapsulate",
        payload: { publicKey },
      });
      const { ciphertext, sharedSecret: encSecret } =
        JSON.parse(encRes.payload).data;

      // Decapsulate
      const decRes = await app.inject({
        method: "POST",
        url: "/v2/pq/decapsulate",
        payload: { secretKey, ciphertext },
      });
      expect(decRes.statusCode).to.equal(200);
      const decBody = JSON.parse(decRes.payload);
      expect(decBody.data).to.have.property("sharedSecret");
      expect(decBody.data.algorithm).to.equal("ml-kem-768");
      // The shared secrets must match
      expect(decBody.data.sharedSecret).to.equal(encSecret);
    });

    it("should return 500 for invalid decapsulate inputs", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/decapsulate",
        payload: { secretKey: "deadbeef", ciphertext: "deadbeef" },
      });
      expect(res.statusCode).to.equal(500);
      const body = JSON.parse(res.payload);
      expect(body.error).to.equal("Decapsulation failed");
    });

    it("should return 400 for missing required fields", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/decapsulate",
        payload: { secretKey: "abc" },
      });
      expect(res.statusCode).to.equal(400);
    });
  });

  // ---------------------------------------------------------------
  // Hybrid X25519 + ML-KEM-768
  // ---------------------------------------------------------------
  describe("POST /v2/pq/hybrid/keygen", () => {
    it("should generate a hybrid key pair", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/keygen",
        payload: {},
      });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.data).to.have.property("x25519PrivateKey");
      expect(body.data).to.have.property("x25519PublicKey");
      expect(body.data).to.have.property("mlKemPublicKey");
      expect(body.data).to.have.property("mlKemSecretKey");
      expect(body.data.algorithm).to.equal("x25519-ml-kem-768");
      // X25519 keys should be 64-char hex (32 bytes)
      expect(body.data.x25519PublicKey).to.have.length(64);
      expect(body.data.x25519PrivateKey).to.have.length(64);
    });
  });

  describe("POST /v2/pq/hybrid/encapsulate", () => {
    it("should perform hybrid encapsulation", async () => {
      // Generate hybrid key pair
      const genRes = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/keygen",
        payload: {},
      });
      const { x25519PublicKey, mlKemPublicKey } =
        JSON.parse(genRes.payload).data;

      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/encapsulate",
        payload: { x25519PublicKey, mlKemPublicKey },
      });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.data).to.have.property("x25519EphemeralPublic");
      expect(body.data).to.have.property("mlKemCiphertext");
      expect(body.data).to.have.property("sharedSecret");
      expect(body.data.algorithm).to.equal("x25519-ml-kem-768");
    });

    it("should return 500 for invalid keys", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/encapsulate",
        payload: {
          x25519PublicKey: "a".repeat(64),
          mlKemPublicKey: "deadbeef",
        },
      });
      expect(res.statusCode).to.equal(500);
      const body = JSON.parse(res.payload);
      expect(body.error).to.equal("Hybrid encapsulation failed");
    });

    it("should return 400 for missing required fields", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/encapsulate",
        payload: { x25519PublicKey: "a".repeat(64) },
      });
      expect(res.statusCode).to.equal(400);
    });
  });

  describe("POST /v2/pq/hybrid/decapsulate", () => {
    it("should perform hybrid decapsulation and recover the shared secret", async () => {
      // Generate hybrid key pair
      const genRes = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/keygen",
        payload: {},
      });
      const { x25519PrivateKey, x25519PublicKey, mlKemPublicKey, mlKemSecretKey } =
        JSON.parse(genRes.payload).data;

      // Encapsulate
      const encRes = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/encapsulate",
        payload: { x25519PublicKey, mlKemPublicKey },
      });
      const { x25519EphemeralPublic, mlKemCiphertext, sharedSecret: encSecret } =
        JSON.parse(encRes.payload).data;

      // Decapsulate
      const decRes = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/decapsulate",
        payload: {
          x25519PrivateKey,
          mlKemSecretKey,
          x25519EphemeralPublic,
          mlKemCiphertext,
        },
      });
      expect(decRes.statusCode).to.equal(200);
      const decBody = JSON.parse(decRes.payload);
      expect(decBody.data).to.have.property("sharedSecret");
      expect(decBody.data.algorithm).to.equal("x25519-ml-kem-768");
      // Shared secrets must match between encapsulate and decapsulate
      expect(decBody.data.sharedSecret).to.equal(encSecret);
    });

    it("should return 500 for invalid decapsulate inputs", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/decapsulate",
        payload: {
          x25519PrivateKey: "b".repeat(64),
          mlKemSecretKey: "deadbeef",
          x25519EphemeralPublic: "c".repeat(64),
          mlKemCiphertext: "deadbeef",
        },
      });
      expect(res.statusCode).to.equal(500);
      const body = JSON.parse(res.payload);
      expect(body.error).to.equal("Hybrid decapsulation failed");
    });

    it("should return 400 for missing required fields", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/decapsulate",
        payload: {
          x25519PrivateKey: "b".repeat(64),
          mlKemSecretKey: "deadbeef",
        },
      });
      expect(res.statusCode).to.equal(400);
    });
  });

  // ---------------------------------------------------------------
  // Auth-required paths (rejectUnauthorized)
  // ---------------------------------------------------------------
  describe("Auth-required paths for PQ routes", () => {
    const origKey = process.env["CRYPTO_API_KEY"];

    beforeEach(() => {
      process.env["CRYPTO_API_KEY"] = "pq-test-key";
    });

    afterEach(() => {
      if (origKey !== undefined) process.env["CRYPTO_API_KEY"] = origKey;
      else delete process.env["CRYPTO_API_KEY"];
    });

    it("should return 401 on /v2/pq/keygen without API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/keygen",
        payload: {},
      });
      expect(res.statusCode).to.equal(401);
    });

    it("should return 401 on /v2/pq/encapsulate without API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/encapsulate",
        payload: { publicKey: "abc" },
      });
      expect(res.statusCode).to.equal(401);
    });

    it("should return 401 on /v2/pq/decapsulate without API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/decapsulate",
        payload: { secretKey: "abc", ciphertext: "abc" },
      });
      expect(res.statusCode).to.equal(401);
    });

    it("should return 401 on /v2/pq/hybrid/keygen without API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/keygen",
        payload: {},
      });
      expect(res.statusCode).to.equal(401);
    });

    it("should return 401 on /v2/pq/hybrid/encapsulate without API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/encapsulate",
        payload: {
          x25519PublicKey: "a".repeat(64),
          mlKemPublicKey: "abc",
        },
      });
      expect(res.statusCode).to.equal(401);
    });

    it("should return 401 on /v2/pq/hybrid/decapsulate without API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/decapsulate",
        payload: {
          x25519PrivateKey: "a".repeat(64),
          mlKemSecretKey: "abc",
          x25519EphemeralPublic: "b".repeat(64),
          mlKemCiphertext: "abc",
        },
      });
      expect(res.statusCode).to.equal(401);
    });

    it("should allow /v2/pq/keygen with correct API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/keygen",
        payload: {},
        headers: { "x-api-key": "pq-test-key" },
      });
      expect(res.statusCode).to.equal(200);
    });
  });
});
