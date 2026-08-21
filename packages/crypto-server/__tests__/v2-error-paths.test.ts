/**
 * Tests for v2 route error paths — catch blocks (500) and
 * rejectUnauthorized branches (401) in signing.ts, encrypt.ts,
 * hash.ts, and kdf.ts.
 */
import { expect } from "chai";
import { init } from "../src/server";
import type { FastifyInstance } from "fastify";

describe("V2 error paths", function () {
  this.timeout(15000);

  let app: FastifyInstance;
  const origApiKey = process.env["CRYPTO_API_KEY"];

  before(async () => {
    delete process.env["CRYPTO_API_KEY"];
    app = await init();
  });

  after(async () => {
    await app.close();
    if (origApiKey !== undefined) process.env["CRYPTO_API_KEY"] = origApiKey;
    else delete process.env["CRYPTO_API_KEY"];
  });

  // ---------------------------------------------------------------
  // signing.ts catch blocks (lines 42-44, 80-82, 121-123)
  // ---------------------------------------------------------------
  describe("POST /v2/keys/generate error path", () => {
    it("should return 401 when API key is required but missing", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "signing-test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/keys/generate",
          payload: { algorithm: "ed25519" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  describe("POST /v2/sign error path", () => {
    it("should return 401 when API key is required but missing", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "signing-test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/sign",
          payload: { privateKey: "a".repeat(64), message: "hello" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should return 400 when signing fails with invalid hex key", async () => {
      // 'g' is not a valid hex char — Buffer.from("ggg...", "hex") gives
      // an empty buffer, which ed25519 will reject as wrong length.
      const res = await app.inject({
        method: "POST",
        url: "/v2/sign",
        payload: {
          privateKey: "g".repeat(64),
          message: "test",
        },
      });
      expect(res.statusCode).to.equal(400);
      const body = JSON.parse(res.payload);
      expect(body.error).to.equal("Signing failed: invalid input");
    });
  });

  describe("POST /v2/verify error path", () => {
    it("should return 401 when API key is required but missing", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "signing-test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/verify",
          payload: {
            publicKey: "a".repeat(64),
            message: "hello",
            signature: "b".repeat(128),
          },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should return 400 when verify fails with invalid hex inputs", async () => {
      // Invalid hex chars produce empty/short buffers, causing noble to throw
      const res = await app.inject({
        method: "POST",
        url: "/v2/verify",
        payload: {
          publicKey: "g".repeat(64),
          message: "hello",
          signature: "g".repeat(128),
        },
      });
      expect(res.statusCode).to.equal(400);
      const body = JSON.parse(res.payload);
      expect(body.error).to.equal("Verification failed: invalid input");
    });
  });

  // ---------------------------------------------------------------
  // encrypt.ts catch blocks (lines 61-63)
  // ---------------------------------------------------------------
  describe("POST /v2/encrypt error path", () => {
    it("should return 401 when API key is required but missing", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "encrypt-test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/encrypt",
          payload: { key: "a".repeat(64), plaintext: "hello" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should return 401 for /v2/decrypt when API key is required but missing", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "encrypt-test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/decrypt",
          payload: { key: "a".repeat(64), ciphertext: "abc" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should return 400 when encrypt fails with invalid key", async () => {
      // Key is 64 hex chars but 'g' is not valid hex — however schema
      // accepts any string of length 64. The crypto op should throw.
      const res = await app.inject({
        method: "POST",
        url: "/v2/encrypt",
        payload: { key: "g".repeat(64), plaintext: "hello" },
      });
      expect(res.statusCode).to.equal(400);
      const body = JSON.parse(res.payload);
      expect(body.error).to.equal("Encryption failed: invalid input");
    });
  });

  // ---------------------------------------------------------------
  // hash.ts catch block (lines 42-44)
  // ---------------------------------------------------------------
  describe("POST /v2/hash error path", () => {
    it("should return 401 when API key is required but missing", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "hash-test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/hash",
          payload: { algorithm: "sha256", data: "hello" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  // ---------------------------------------------------------------
  // kdf.ts catch block (lines 70-72)
  // ---------------------------------------------------------------
  describe("POST /v2/kdf error path", () => {
    it("should return 401 when API key is required but missing", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "kdf-test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/kdf",
          payload: { algorithm: "scrypt", password: "test" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should return 500 when scrypt fails with invalid N (not power of 2)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/kdf",
        payload: {
          algorithm: "scrypt",
          password: "test",
          params: { N: 3, r: 8, p: 1 },
        },
      });
      expect(res.statusCode).to.equal(500);
      const body = JSON.parse(res.payload);
      expect(body.error).to.equal("Key derivation failed");
    });
  });

  // ---------------------------------------------------------------
  // Cache-Control header on v2 routes
  // ---------------------------------------------------------------
  describe("Cache-Control headers", () => {
    it("should include Cache-Control: no-store on v2 responses", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hash",
        payload: { algorithm: "sha256", data: "hello" },
      });
      expect(res.statusCode).to.equal(200);
      expect(res.headers["cache-control"]).to.equal(
        "no-store, no-cache, must-revalidate",
      );
      expect(res.headers["pragma"]).to.equal("no-cache");
    });

    it("should not include Cache-Control: no-store on non-v2 responses", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).to.equal(200);
      expect(res.headers["cache-control"]).to.not.equal(
        "no-store, no-cache, must-revalidate",
      );
    });
  });

  // ---------------------------------------------------------------
  // Auth success with correct key (confirm routes work with key)
  // ---------------------------------------------------------------
  describe("Authenticated requests with correct key", () => {
    const testKey = "correct-v2-test-key";

    beforeEach(() => {
      process.env["CRYPTO_API_KEY"] = testKey;
    });

    afterEach(() => {
      delete process.env["CRYPTO_API_KEY"];
    });

    it("should allow /v2/hash with correct API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hash",
        payload: { algorithm: "sha256", data: "hello" },
        headers: { "x-api-key": testKey },
      });
      expect(res.statusCode).to.equal(200);
    });

    it("should allow /v2/kdf with correct API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/kdf",
        payload: {
          algorithm: "scrypt",
          password: "test",
          params: { N: 1024, r: 8, p: 1 },
        },
        headers: { "x-api-key": testKey },
      });
      expect(res.statusCode).to.equal(200);
    });

    it("should allow /v2/encrypt with correct API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/encrypt",
        payload: { key: "a".repeat(64), plaintext: "hello" },
        headers: { "x-api-key": testKey },
      });
      expect(res.statusCode).to.equal(200);
    });

    it("should allow /v2/keys/generate with correct API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/keys/generate",
        payload: { algorithm: "ed25519" },
        headers: { "x-api-key": testKey },
      });
      expect(res.statusCode).to.equal(200);
    });

    it("should allow /v2/kdf with keyLength param", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/kdf",
        payload: { algorithm: "hkdf-sha256", password: "test", keyLength: 64 },
        headers: { "x-api-key": testKey },
      });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.body);
      expect(body.data.keyLength).to.equal(64);
    });
  });

  // ---------------------------------------------------------------
  // V1 routes — rejectUnauthorized branches
  // ---------------------------------------------------------------
  describe("V1 auth-required routes", () => {
    const testKey = "v1-auth-test-key";

    before(() => {
      process.env["CRYPTO_API_KEY"] = testKey;
    });

    after(() => {
      delete process.env["CRYPTO_API_KEY"];
    });

    it("should return 401 on POST /v1/decrypt without API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/decrypt",
        payload: {
          passphrase: "x",
          message: "x",
          publicKey: "x",
          privateKey: "x",
        },
      });
      expect(res.statusCode).to.equal(401);
    });

    it("should return 401 on POST /v1/generate without API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/generate",
        payload: {
          name: "Test",
          email: "test@test.com",
          type: "ecc",
          passphrase: "testpass",
          curve: "curve25519",
          format: "armored",
        },
      });
      expect(res.statusCode).to.equal(401);
    });

    it("should return 401 on POST /v1/revoke without API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/revoke",
        payload: {
          passphrase: "testpass",
          flag: 0,
          reason: "test reason",
        },
      });
      expect(res.statusCode).to.equal(401);
    });

    it("should return 400 on POST /v1/revoke with invalid flag", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/revoke",
        payload: {
          passphrase: "testpass",
          flag: 99,
          reason: "test reason",
        },
        headers: { "x-api-key": testKey },
      });
      expect(res.statusCode).to.equal(400);
    });

    it("should return 401 on POST /v1/verify without API key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/verify",
        payload: {
          date: new Date().toISOString(),
          message: "test message",
          verificationKeys: "dGVzdA==",
        },
      });
      expect(res.statusCode).to.equal(401);
    });
  });
});
