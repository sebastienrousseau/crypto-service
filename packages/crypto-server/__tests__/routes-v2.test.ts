/**
 * Tests for v2 API routes (modern crypto operations).
 */
import { expect } from "chai";
import { init } from "../src/server";
import type { FastifyInstance } from "fastify";

describe("V2 API Routes", function () {
  this.timeout(15000);

  let app: FastifyInstance;
  const testKey = "a".repeat(64); // 32 bytes hex

  before(async () => {
    app = await init();
  });

  after(async () => {
    await app.close();
  });

  describe("GET /v2/algorithms", () => {
    it("should return supported algorithms", async () => {
      const res = await app.inject({ method: "GET", url: "/v2/algorithms" });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.data).to.have.property("encryption");
      expect(body.data).to.have.property("hashing");
      expect(body.data).to.have.property("kdf");
      expect(body.data).to.have.property("signing");
      expect(body.data).to.have.property("keyExchange");
    });
  });

  describe("POST /v2/encrypt + /v2/decrypt", () => {
    it("should encrypt and decrypt successfully", async () => {
      const encRes = await app.inject({
        method: "POST",
        url: "/v2/encrypt",
        payload: { key: testKey, plaintext: "Hello v2!" },
      });
      expect(encRes.statusCode).to.equal(200);
      const encBody = JSON.parse(encRes.payload);
      expect(encBody.data.algorithm).to.equal("xchacha20-poly1305");

      const decRes = await app.inject({
        method: "POST",
        url: "/v2/decrypt",
        payload: { key: testKey, ciphertext: encBody.data.ciphertext },
      });
      expect(decRes.statusCode).to.equal(200);
      const decBody = JSON.parse(decRes.payload);
      expect(decBody.data.plaintext).to.equal("Hello v2!");
    });

    it("should return 400 for missing key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/encrypt",
        payload: { plaintext: "test" },
      });
      expect(res.statusCode).to.equal(400);
    });

    it("should return 500 for wrong key on decrypt", async () => {
      const encRes = await app.inject({
        method: "POST",
        url: "/v2/encrypt",
        payload: { key: testKey, plaintext: "secret" },
      });
      const { ciphertext } = JSON.parse(encRes.payload).data;

      const decRes = await app.inject({
        method: "POST",
        url: "/v2/decrypt",
        payload: { key: "b".repeat(64), ciphertext },
      });
      expect(decRes.statusCode).to.equal(500);
    });
  });

  describe("POST /v2/hash", () => {
    it("should compute SHA-256 hash", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hash",
        payload: { algorithm: "sha256", data: "hello" },
      });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.data.algorithm).to.equal("sha256");
      expect(body.data.digest).to.have.length(64);
    });

    it("should compute BLAKE3 hash", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hash",
        payload: { algorithm: "blake3", data: "test" },
      });
      expect(res.statusCode).to.equal(200);
    });

    it("should reject invalid algorithm", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hash",
        payload: { algorithm: "md5", data: "test" },
      });
      expect(res.statusCode).to.equal(400);
    });
  });

  describe("POST /v2/kdf", () => {
    it("should derive key with scrypt", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/kdf",
        payload: {
          algorithm: "scrypt",
          password: "mypassword",
          params: { N: 1024, r: 8, p: 1 },
        },
      });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.data.algorithm).to.equal("scrypt");
      expect(body.data.derivedKey).to.have.length(64);
      expect(body.data.salt).to.be.a("string");
    });

    it("should derive with HKDF", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/kdf",
        payload: {
          algorithm: "hkdf-sha256",
          password: "input-key",
          salt: "aa".repeat(16),
        },
      });
      expect(res.statusCode).to.equal(200);
    });
  });

  describe("POST /v2/keys/generate + /v2/sign + /v2/verify", () => {
    it("should generate key pair, sign, and verify", async () => {
      // Generate
      const genRes = await app.inject({
        method: "POST",
        url: "/v2/keys/generate",
        payload: { algorithm: "ed25519" },
      });
      expect(genRes.statusCode).to.equal(200);
      const { privateKey, publicKey } = JSON.parse(genRes.payload).data;
      expect(privateKey).to.have.length(64);
      expect(publicKey).to.have.length(64);

      // Sign
      const signRes = await app.inject({
        method: "POST",
        url: "/v2/sign",
        payload: { privateKey, message: "Sign this" },
      });
      expect(signRes.statusCode).to.equal(200);
      const { signature } = JSON.parse(signRes.payload).data;
      expect(signature).to.have.length(128);

      // Verify
      const verRes = await app.inject({
        method: "POST",
        url: "/v2/verify",
        payload: { publicKey, message: "Sign this", signature },
      });
      expect(verRes.statusCode).to.equal(200);
      const { valid } = JSON.parse(verRes.payload).data;
      expect(valid).to.be.true;
    });

    it("should return false for invalid signature", async () => {
      const genRes = await app.inject({
        method: "POST",
        url: "/v2/keys/generate",
        payload: {},
      });
      const { publicKey } = JSON.parse(genRes.payload).data;

      const verRes = await app.inject({
        method: "POST",
        url: "/v2/verify",
        payload: { publicKey, message: "msg", signature: "f".repeat(128) },
      });
      expect(verRes.statusCode).to.equal(200);
      const { valid } = JSON.parse(verRes.payload).data;
      expect(valid).to.be.false;
    });
  });
});
