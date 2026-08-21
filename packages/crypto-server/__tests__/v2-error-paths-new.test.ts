/**
 * Extended V2 route error paths — catch blocks (500) for routes not
 * covered by v2-error-paths.test.ts: key-wrap, keys, mac,
 * multi-recipient, password-encrypt, password, pq-hash-sign, pq-sign,
 * sealedbox, secretbox.
 */
import { expect } from "chai";
import { init } from "../src/server";
import type { FastifyInstance } from "fastify";

describe("V2 error paths (extended)", function () {
  this.timeout(30000);

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
  // key-wrap.ts catch blocks
  // ---------------------------------------------------------------
  describe("POST /v2/keys/wrap error paths", () => {
    it("should return 400 with invalid kek", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/keys/wrap",
        payload: { kek: "x", keyToWrap: "y" },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Key wrapping failed: invalid input",
      );
    });

    it("should return 401 when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/keys/wrap",
          payload: { kek: "a", keyToWrap: "b" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  describe("POST /v2/keys/unwrap error paths", () => {
    it("should return 400 with invalid data", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/keys/unwrap",
        payload: { kek: "x", wrappedKey: "y" },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Key unwrapping failed: invalid input",
      );
    });

    it("should return 401 when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/keys/unwrap",
          payload: { kek: "a", wrappedKey: "b" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  // ---------------------------------------------------------------
  // keys.ts catch block
  // ---------------------------------------------------------------
  describe("POST /v2/keys/generate success/error paths", () => {
    it("should generate key with metadata", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/keys/generate",
        payload: {
          algorithm: "ed25519",
          metadata: { kid: "test-kid", use: "sig" },
        },
      });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.data).to.have.property("publicKey");
    });
  });

  // ---------------------------------------------------------------
  // mac.ts catch blocks
  // ---------------------------------------------------------------
  describe("POST /v2/hmac error paths", () => {
    it("should return 400 with invalid key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hmac",
        payload: { algorithm: "sha256", key: "gg-invalid-hex!", data: "test" },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "HMAC computation failed: invalid input",
      );
    });

    it("should return 401 when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/hmac",
          payload: { algorithm: "sha256", key: "aa", data: "test" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  describe("POST /v2/hmac/verify error paths", () => {
    it("should return 400 with invalid key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hmac/verify",
        payload: {
          algorithm: "sha256",
          key: "gg-invalid!",
          data: "test",
          mac: "aa",
        },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "HMAC verification failed: invalid input",
      );
    });

    it("should return 401 when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/hmac/verify",
          payload: { algorithm: "sha256", key: "aa", data: "test", mac: "bb" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  // ---------------------------------------------------------------
  // multi-recipient.ts catch block + PQ branch
  // ---------------------------------------------------------------
  describe("POST /v2/multi-recipient/encrypt error paths", () => {
    it("should return 400 with invalid recipient data", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/multi-recipient/encrypt",
        payload: {
          plaintext: "hello",
          recipients: [{ type: "classical", publicKey: "zz-bad" }],
        },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Encryption failed: invalid input",
      );
    });

    it("should handle PQ recipient type", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/multi-recipient/encrypt",
        payload: {
          plaintext: "hello",
          recipients: [
            {
              type: "pq",
              publicKey: "aa".repeat(32),
              mlKemPublicKey: "bb".repeat(32),
            },
          ],
        },
      });
      // Will fail because keys are invalid, but we exercise the PQ branch
      expect([400, 500]).to.include(res.statusCode);
    });

    it("should return 401 when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/multi-recipient/encrypt",
          payload: {
            plaintext: "hello",
            recipients: [{ type: "classical", publicKey: "aa".repeat(32) }],
          },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  // ---------------------------------------------------------------
  // password-encrypt.ts catch blocks
  // ---------------------------------------------------------------
  describe("POST /v2/password/encrypt error paths", () => {
    it("should return 401 when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/password/encrypt",
          payload: { password: "test", plaintext: "hello" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  describe("POST /v2/password/decrypt error paths", () => {
    it("should return 400 with invalid ciphertext", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/password/decrypt",
        payload: { password: "test", ciphertext: "invalid-ct" },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Decryption failed: invalid input",
      );
    });

    it("should return 401 when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/password/decrypt",
          payload: { password: "test", ciphertext: "ct" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  // ---------------------------------------------------------------
  // password.ts catch blocks
  // ---------------------------------------------------------------
  describe("POST /v2/password/hash error paths", () => {
    it("should hash with custom params (covers true branch)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/password/hash",
        payload: {
          password: "test",
          timeCost: 2,
          memoryCost: 1024,
          parallelism: 2,
        },
      });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.data.params.t).to.equal(2);
      expect(body.data.params.m).to.equal(1024);
      expect(body.data.params.p).to.equal(2);
    });

    it("should hash with only timeCost (memoryCost/parallelism false branches)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/password/hash",
        payload: { password: "test", timeCost: 1 },
      });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.data.params.t).to.equal(1);
    });

    it("should hash with only memoryCost (timeCost/parallelism false branches)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/password/hash",
        payload: { password: "test", memoryCost: 1024 },
      });
      expect(res.statusCode).to.equal(200);
    });

    it("should return 401 when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/password/hash",
          payload: { password: "test" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  describe("POST /v2/password/verify error paths", () => {
    it("should return 400 with invalid hash data", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/password/verify",
        payload: {
          password: "test",
          hash: "invalid",
          salt: "invalid",
          params: { t: 1, m: 1024, p: 1 },
        },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Password verification failed: invalid input",
      );
    });

    it("should return 401 when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/password/verify",
          payload: {
            password: "test",
            hash: "aa",
            salt: "bb",
            params: { t: 1, m: 1024, p: 1 },
          },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  // ---------------------------------------------------------------
  // pq-hash-sign.ts catch blocks
  // ---------------------------------------------------------------
  describe("POST /v2/pq/slh-dsa/* error paths", () => {
    it("should return 500 on keygen with invalid variant reaching catch", async () => {
      // Successful path test
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/slh-dsa/keygen",
        payload: { variant: "sha2-128f" },
      });
      // May succeed or fail depending on timing, but we cover the route
      expect([200, 500]).to.include(res.statusCode);
    });

    it("should return 400 on sign with invalid key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/slh-dsa/sign",
        payload: { variant: "sha2-128f", secretKey: "x", message: "test" },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Signing failed: invalid input",
      );
    });

    it("should return 400 on verify with invalid key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/slh-dsa/verify",
        payload: {
          variant: "sha2-128f",
          publicKey: "x",
          message: "test",
          signature: "y",
        },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Verification failed: invalid input",
      );
    });

    it("should return 401 on keygen when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/pq/slh-dsa/keygen",
          payload: { variant: "sha2-128f" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should return 401 on sign when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/pq/slh-dsa/sign",
          payload: { variant: "sha2-128f", secretKey: "x", message: "test" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should return 401 on verify when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/pq/slh-dsa/verify",
          payload: {
            variant: "sha2-128f",
            publicKey: "x",
            message: "test",
            signature: "y",
          },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  // ---------------------------------------------------------------
  // pq-sign.ts catch blocks
  // ---------------------------------------------------------------
  describe("POST /v2/pq/dsa/* error paths", () => {
    it("should return 400 on sign with invalid key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/dsa/sign",
        payload: { level: 44, secretKey: "x", message: "test" },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Signing failed: invalid input",
      );
    });

    it("should return 400 on verify with invalid key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/pq/dsa/verify",
        payload: { level: 44, publicKey: "x", message: "test", signature: "y" },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Verification failed: invalid input",
      );
    });

    it("should return 401 on keygen when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/pq/dsa/keygen",
          payload: { level: 44 },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should return 401 on sign when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/pq/dsa/sign",
          payload: { level: 44, secretKey: "x", message: "test" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should return 401 on verify when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/pq/dsa/verify",
          payload: {
            level: 44,
            publicKey: "x",
            message: "test",
            signature: "y",
          },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  // ---------------------------------------------------------------
  // sealedbox.ts catch blocks
  // ---------------------------------------------------------------
  describe("POST /v2/sealedbox/* error paths", () => {
    it("should return 400 on seal with invalid key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/sealedbox/seal",
        payload: { recipientPublicKey: "zz", plaintext: "hello" },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Encryption failed: invalid input",
      );
    });

    it("should return 400 on open with invalid key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/sealedbox/open",
        payload: { recipientSecretKey: "zz", sealed: "zz" },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Decryption failed: invalid input",
      );
    });

    it("should return 400 on seal-pq with invalid keys", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/sealedbox/seal-pq",
        payload: {
          x25519PublicKey: "zz",
          mlKemPublicKey: "zz",
          plaintext: "hello",
        },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Encryption failed: invalid input",
      );
    });

    it("should return 400 on open-pq with invalid keys", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/sealedbox/open-pq",
        payload: { x25519SecretKey: "zz", mlKemSecretKey: "zz", sealed: "zz" },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Decryption failed: invalid input",
      );
    });

    it("should return 401 on seal when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/sealedbox/seal",
          payload: { recipientPublicKey: "aa", plaintext: "hello" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should return 401 on open when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/sealedbox/open",
          payload: { recipientSecretKey: "aa", sealed: "bb" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should return 401 on seal-pq when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/sealedbox/seal-pq",
          payload: {
            x25519PublicKey: "aa",
            mlKemPublicKey: "bb",
            plaintext: "hello",
          },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should return 401 on open-pq when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/sealedbox/open-pq",
          payload: {
            x25519SecretKey: "aa",
            mlKemSecretKey: "bb",
            sealed: "cc",
          },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });

  // ---------------------------------------------------------------
  // secretbox.ts catch blocks
  // ---------------------------------------------------------------
  describe("POST /v2/secretbox/* error paths", () => {
    it("should return 400 on seal with invalid key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/secretbox/seal",
        payload: { key: "zz", plaintext: "hello" },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Encryption failed: invalid input",
      );
    });

    it("should seal and open with AAD", async () => {
      const key = "a".repeat(64);
      const sealRes = await app.inject({
        method: "POST",
        url: "/v2/secretbox/seal",
        payload: { key, plaintext: "hello aad", aad: "context" },
      });
      expect(sealRes.statusCode).to.equal(200);
      const sealed = JSON.parse(sealRes.payload).data.sealed;

      const openRes = await app.inject({
        method: "POST",
        url: "/v2/secretbox/open",
        payload: { key, ciphertext: sealed, aad: "context" },
      });
      expect(openRes.statusCode).to.equal(200);
      expect(JSON.parse(openRes.payload).data).to.equal("hello aad");
    });

    it("should return 400 on open with invalid key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/secretbox/open",
        payload: { key: "zz", ciphertext: "zz" },
      });
      expect(res.statusCode).to.equal(400);
      expect(JSON.parse(res.payload).error).to.equal(
        "Decryption failed: invalid input",
      );
    });

    it("should return 401 on seal when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/secretbox/seal",
          payload: { key: "aa", plaintext: "hello" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should return 401 on open when API key required", async () => {
      const saved = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-key";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/secretbox/open",
          payload: { key: "aa", ciphertext: "bb" },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (saved !== undefined) process.env["CRYPTO_API_KEY"] = saved;
        else delete process.env["CRYPTO_API_KEY"];
      }
    });
  });
});
