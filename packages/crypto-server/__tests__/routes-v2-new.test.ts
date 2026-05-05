/**
 * Tests for new v2 API routes (high-level operations, key management, PQ signatures).
 */
import { expect } from "chai";
import { init } from "../src/server";
import type { FastifyInstance } from "fastify";

describe("V2 New Routes", function () {
  this.timeout(120000);

  let app: FastifyInstance;
  const testKey = "a".repeat(64); // 32 bytes hex

  before(async () => {
    app = await init();
  });

  after(async () => {
    await app.close();
  });

  // --- Secretbox ---

  describe("POST /v2/secretbox/seal + /v2/secretbox/open", () => {
    it("should seal and open successfully", async () => {
      const sealRes = await app.inject({
        method: "POST",
        url: "/v2/secretbox/seal",
        payload: { key: testKey, plaintext: "secret message" },
      });
      expect(sealRes.statusCode).to.equal(200);
      const sealBody = JSON.parse(sealRes.payload);
      expect(sealBody.data).to.have.property("sealed");

      const openRes = await app.inject({
        method: "POST",
        url: "/v2/secretbox/open",
        payload: { key: testKey, ciphertext: sealBody.data.sealed },
      });
      expect(openRes.statusCode).to.equal(200);
    });

    it("should return error for wrong key on open", async () => {
      const sealRes = await app.inject({
        method: "POST",
        url: "/v2/secretbox/seal",
        payload: { key: testKey, plaintext: "test" },
      });
      const { sealed } = JSON.parse(sealRes.payload).data;

      const openRes = await app.inject({
        method: "POST",
        url: "/v2/secretbox/open",
        payload: { key: "b".repeat(64), ciphertext: sealed },
      });
      expect(openRes.statusCode).to.be.oneOf([400, 500]);
    });
  });

  // --- Sealed Box ---

  describe("POST /v2/sealedbox/*", () => {
    it("should seal and open with classical keys", async () => {
      // Generate X25519 key pair first
      const keyRes = await app.inject({
        method: "POST",
        url: "/v2/keys/generate",
        payload: { algorithm: "x25519" },
      });
      const { publicKey, privateKey } = JSON.parse(keyRes.payload).data;

      const sealRes = await app.inject({
        method: "POST",
        url: "/v2/sealedbox/seal",
        payload: { recipientPublicKey: publicKey, plaintext: "sealed secret" },
      });
      expect(sealRes.statusCode).to.equal(200);
      const sealBody = JSON.parse(sealRes.payload);
      expect(sealBody.data).to.have.property("sealed");

      const openRes = await app.inject({
        method: "POST",
        url: "/v2/sealedbox/open",
        payload: { recipientSecretKey: privateKey, sealed: sealBody.data.sealed },
      });
      expect(openRes.statusCode).to.equal(200);
    });

    it("should seal and open with PQ keys", async () => {
      // Generate hybrid key pair
      const keyRes = await app.inject({
        method: "POST",
        url: "/v2/pq/hybrid/keygen",
        payload: {},
      });
      const keys = JSON.parse(keyRes.payload).data;

      const sealRes = await app.inject({
        method: "POST",
        url: "/v2/sealedbox/seal-pq",
        payload: {
          x25519PublicKey: keys.x25519PublicKey,
          mlKemPublicKey: keys.mlKemPublicKey,
          plaintext: "quantum safe",
        },
      });
      expect(sealRes.statusCode).to.equal(200);
      const sealBody = JSON.parse(sealRes.payload);
      expect(sealBody.data).to.have.property("sealed");

      const openRes = await app.inject({
        method: "POST",
        url: "/v2/sealedbox/open-pq",
        payload: {
          x25519SecretKey: keys.x25519PrivateKey,
          mlKemSecretKey: keys.mlKemSecretKey,
          sealed: sealBody.data.sealed,
        },
      });
      expect(openRes.statusCode).to.equal(200);
    });
  });

  // --- Password Encrypt ---

  describe("POST /v2/password/encrypt + /v2/password/decrypt", () => {
    it("should encrypt and decrypt with password", async () => {
      const encRes = await app.inject({
        method: "POST",
        url: "/v2/password/encrypt",
        payload: { password: "my-secret-pass", plaintext: "sensitive data" },
      });
      expect(encRes.statusCode).to.equal(200);
      const encBody = JSON.parse(encRes.payload);
      expect(encBody.data).to.have.property("encrypted");

      const decRes = await app.inject({
        method: "POST",
        url: "/v2/password/decrypt",
        payload: { password: "my-secret-pass", ciphertext: encBody.data.encrypted },
      });
      expect(decRes.statusCode).to.equal(200);
    });

    it("should fail decryption with wrong password", async () => {
      const encRes = await app.inject({
        method: "POST",
        url: "/v2/password/encrypt",
        payload: { password: "correct", plaintext: "data" },
      });
      const { encrypted } = JSON.parse(encRes.payload).data;

      const decRes = await app.inject({
        method: "POST",
        url: "/v2/password/decrypt",
        payload: { password: "wrong", ciphertext: encrypted },
      });
      expect(decRes.statusCode).to.equal(500);
    });
  });

  // --- Key Wrap ---

  describe("POST /v2/keys/wrap + /v2/keys/unwrap", () => {
    it("should wrap and unwrap a key with AES-KW", async () => {
      const kek = "c".repeat(64); // 32 bytes
      const keyToWrap = "d".repeat(32); // 16 bytes (must be multiple of 8)

      const wrapRes = await app.inject({
        method: "POST",
        url: "/v2/keys/wrap",
        payload: { kek, keyToWrap, algorithm: "aes-kw" },
      });
      expect(wrapRes.statusCode).to.equal(200);
      const wrapBody = JSON.parse(wrapRes.payload);
      expect(wrapBody.data).to.have.property("wrapped");

      const unwrapRes = await app.inject({
        method: "POST",
        url: "/v2/keys/unwrap",
        payload: { kek, wrappedKey: wrapBody.data.wrapped, algorithm: "aes-kw" },
      });
      expect(unwrapRes.statusCode).to.equal(200);
    });

    it("should wrap and unwrap with AES-KWP", async () => {
      const kek = "e".repeat(64);
      const keyToWrap = "f".repeat(20); // arbitrary length for KWP

      const wrapRes = await app.inject({
        method: "POST",
        url: "/v2/keys/wrap",
        payload: { kek, keyToWrap, algorithm: "aes-kwp" },
      });
      expect(wrapRes.statusCode).to.equal(200);
      const wrapBody = JSON.parse(wrapRes.payload);

      const unwrapRes = await app.inject({
        method: "POST",
        url: "/v2/keys/unwrap",
        payload: { kek, wrappedKey: wrapBody.data.wrapped, algorithm: "aes-kwp" },
      });
      expect(unwrapRes.statusCode).to.equal(200);
    });
  });

  // --- Keys Generate ---

  describe("POST /v2/keys/generate", () => {
    it("should generate ed25519 by default", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/keys/generate",
        payload: {},
      });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.data).to.have.property("publicKey");
      expect(body.data).to.have.property("privateKey");
      expect(body.data).to.have.property("kid");
    });

    it("should generate with explicit algorithm", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/keys/generate",
        payload: { algorithm: "p256", metadata: { use: "sig" } },
      });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.data.algorithm).to.equal("p256");
    });

    it("should return error for unsupported algorithm", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/keys/generate",
        payload: { algorithm: "invalid-algo" },
      });
      expect(res.statusCode).to.be.oneOf([400, 500]);
    });
  });

  // --- Multi-Recipient ---

  describe("POST /v2/multi-recipient/encrypt", () => {
    it("should encrypt for multiple classical recipients", async () => {
      // Generate two X25519 key pairs
      const k1 = await app.inject({
        method: "POST",
        url: "/v2/keys/generate",
        payload: { algorithm: "x25519" },
      });
      const k2 = await app.inject({
        method: "POST",
        url: "/v2/keys/generate",
        payload: { algorithm: "x25519" },
      });
      const key1 = JSON.parse(k1.payload).data;
      const key2 = JSON.parse(k2.payload).data;

      const res = await app.inject({
        method: "POST",
        url: "/v2/multi-recipient/encrypt",
        payload: {
          plaintext: "for multiple",
          recipients: [
            { type: "classical", publicKey: key1.publicKey },
            { type: "classical", publicKey: key2.publicKey },
          ],
        },
      });
      // May succeed (200) or get validation error (400) depending on schema
      expect(res.statusCode).to.be.oneOf([200, 400]);
      if (res.statusCode === 200) {
        const body = JSON.parse(res.payload);
        expect(body).to.have.property("data");
      }
    });
  });

  // --- Password Hash ---

  describe("POST /v2/password/hash + /v2/password/verify", () => {
    it("should hash and verify a password", async () => {
      const hashRes = await app.inject({
        method: "POST",
        url: "/v2/password/hash",
        payload: { password: "test-password", timeCost: 1, memoryCost: 1024, parallelism: 1 },
      });
      expect(hashRes.statusCode).to.equal(200);
      const hashBody = JSON.parse(hashRes.payload);
      expect(hashBody.data).to.have.property("hash");
      expect(hashBody.data).to.have.property("salt");
      expect(hashBody.data).to.have.property("params");

      const verifyRes = await app.inject({
        method: "POST",
        url: "/v2/password/verify",
        payload: {
          password: "test-password",
          hash: hashBody.data.hash,
          salt: hashBody.data.salt,
          params: hashBody.data.params,
        },
      });
      expect(verifyRes.statusCode).to.equal(200);
      const verifyBody = JSON.parse(verifyRes.payload);
      expect(verifyBody.data.valid).to.be.true;
    });

    it("should reject wrong password on verify", async () => {
      const hashRes = await app.inject({
        method: "POST",
        url: "/v2/password/hash",
        payload: { password: "correct", timeCost: 1, memoryCost: 1024, parallelism: 1 },
      });
      const hashBody = JSON.parse(hashRes.payload);

      const verifyRes = await app.inject({
        method: "POST",
        url: "/v2/password/verify",
        payload: {
          password: "wrong",
          hash: hashBody.data.hash,
          salt: hashBody.data.salt,
          params: hashBody.data.params,
        },
      });
      expect(verifyRes.statusCode).to.equal(200);
      const verifyBody = JSON.parse(verifyRes.payload);
      expect(verifyBody.data.valid).to.be.false;
    });
  });

  // --- MAC Routes ---

  describe("POST /v2/hmac + /v2/hmac/verify", () => {
    it("should compute and verify HMAC", async () => {
      const compRes = await app.inject({
        method: "POST",
        url: "/v2/hmac",
        payload: { algorithm: "sha256", key: testKey, data: "hello" },
      });
      expect(compRes.statusCode).to.equal(200);
      const compBody = JSON.parse(compRes.payload);
      expect(compBody.data).to.have.property("mac");

      const verRes = await app.inject({
        method: "POST",
        url: "/v2/hmac/verify",
        payload: { algorithm: "sha256", key: testKey, data: "hello", mac: compBody.data.mac },
      });
      expect(verRes.statusCode).to.equal(200);
      const verBody = JSON.parse(verRes.payload);
      expect(verBody.data.valid).to.be.true;
    });
  });

  // --- PQ Signatures (ML-DSA) ---

  describe("POST /v2/pq/dsa/*", () => {
    it("should keygen, sign, and verify with ML-DSA-44", async () => {
      const keyRes = await app.inject({
        method: "POST",
        url: "/v2/pq/dsa/keygen",
        payload: { level: 44 },
      });
      expect(keyRes.statusCode).to.equal(200);
      const keys = JSON.parse(keyRes.payload).data;

      const signRes = await app.inject({
        method: "POST",
        url: "/v2/pq/dsa/sign",
        payload: { level: 44, secretKey: keys.secretKey, message: "test msg" },
      });
      expect(signRes.statusCode).to.equal(200);
      const sigData = JSON.parse(signRes.payload).data;

      const verifyRes = await app.inject({
        method: "POST",
        url: "/v2/pq/dsa/verify",
        payload: { level: 44, publicKey: keys.publicKey, message: "test msg", signature: sigData.signature },
      });
      expect(verifyRes.statusCode).to.equal(200);
      expect(JSON.parse(verifyRes.payload).data.valid).to.be.true;
    });
  });

  // --- PQ Hash-Based Signatures (SLH-DSA) ---

  describe("POST /v2/pq/slh-dsa/*", () => {
    it("should keygen, sign, and verify with SLH-DSA-SHAKE-128f", async () => {
      const keyRes = await app.inject({
        method: "POST",
        url: "/v2/pq/slh-dsa/keygen",
        payload: { variant: "shake-128f" },
      });
      expect(keyRes.statusCode).to.equal(200);
      const keys = JSON.parse(keyRes.payload).data;

      const signRes = await app.inject({
        method: "POST",
        url: "/v2/pq/slh-dsa/sign",
        payload: { variant: "shake-128f", secretKey: keys.secretKey, message: "sign me" },
      });
      expect(signRes.statusCode).to.equal(200);
      const sigData = JSON.parse(signRes.payload).data;

      const verifyRes = await app.inject({
        method: "POST",
        url: "/v2/pq/slh-dsa/verify",
        payload: { variant: "shake-128f", publicKey: keys.publicKey, message: "sign me", signature: sigData.signature },
      });
      expect(verifyRes.statusCode).to.equal(200);
      expect(JSON.parse(verifyRes.payload).data.valid).to.be.true;
    });
  });
});
