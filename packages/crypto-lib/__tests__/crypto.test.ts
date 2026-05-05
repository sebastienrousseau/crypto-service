import { expect } from "chai";
import { crypto } from "../src/crypto";

describe("Unified Crypto API", () => {
  describe("randomKey", () => {
    it("should return a 64-char hex string (256 bits)", () => {
      const key = crypto.randomKey();
      expect(key).to.match(/^[0-9a-f]{64}$/);
    });

    it("should produce unique keys", () => {
      const k1 = crypto.randomKey();
      const k2 = crypto.randomKey();
      expect(k1).to.not.equal(k2);
    });
  });

  describe("encrypt / decrypt", () => {
    it("should round-trip string plaintext", () => {
      const key = crypto.randomKey();
      const ct = crypto.encrypt(key, "hello unified API");
      const pt = crypto.decrypt(key, ct);
      expect(Buffer.from(pt).toString("utf8")).to.equal("hello unified API");
    });

    it("should fail with wrong key", () => {
      const key1 = crypto.randomKey();
      const key2 = crypto.randomKey();
      const ct = crypto.encrypt(key1, "secret");
      expect(() => crypto.decrypt(key2, ct)).to.throw();
    });
  });

  describe("hash", () => {
    it("should hash with sha3-256", () => {
      const h = crypto.hash("sha3-256", "test");
      expect(h).to.match(/^[0-9a-f]+$/);
      expect(h).to.have.length(64); // SHA3-256 = 32 bytes = 64 hex
    });

    it("should be deterministic", () => {
      expect(crypto.hash("sha256", "x")).to.equal(crypto.hash("sha256", "x"));
    });
  });

  describe("generateKeyPair", () => {
    it("should generate Ed25519 key pair", () => {
      const kp = crypto.generateKeyPair("ed25519");
      expect(kp.algorithm).to.equal("ed25519");
      expect(kp.kid).to.be.a("string");
    });
  });

  describe("sign / verify", () => {
    it("should sign and verify with Ed25519", () => {
      const kp = crypto.generateKeyPair("ed25519");
      const sig = crypto.sign("ed25519", kp.privateKey, "message");
      const valid = crypto.verify("ed25519", kp.publicKey, "message", sig);
      expect(valid).to.be.true;
    });

    it("should reject wrong message", () => {
      const kp = crypto.generateKeyPair("ed25519");
      const sig = crypto.sign("ed25519", kp.privateKey, "message");
      const valid = crypto.verify("ed25519", kp.publicKey, "wrong", sig);
      expect(valid).to.be.false;
    });
  });

  describe("hashPassword / verifyPassword", () => {
    it("should hash and verify a password", () => {
      // Use lightweight Argon2id via the lower-level API to avoid 64MB default
      const { hashPassword: hp, verifyPassword: vp } = require("../src/modern/password");
      const hashed = hp({ password: "mypassword", timeCost: 1, memoryCost: 1024, parallelism: 1 });
      expect(hashed.algorithm).to.equal("argon2id");
      const result = vp({
        password: "mypassword",
        hash: hashed.hash,
        salt: hashed.salt,
        params: hashed.params,
      });
      expect(result.valid).to.be.true;
    });
  });

  describe("hmac / hmacVerify", () => {
    it("should compute and verify HMAC", () => {
      const key = crypto.randomKey();
      const mac = crypto.hmac("sha256", key, "data");
      const valid = crypto.hmacVerify("sha256", key, "data", mac);
      expect(valid).to.be.true;
    });
  });

  describe("registry", () => {
    it("should access algorithm registry", () => {
      const algo = crypto.registry.get("ml-kem-768");
      expect(algo).to.exist;
      expect(algo!.standard).to.equal("FIPS 203");
    });

    it("should list recommended algorithms", () => {
      const recs = crypto.registry.recommended();
      expect(recs.length).to.be.greaterThan(10);
    });

    it("should check deprecation", () => {
      expect(crypto.registry.isDeprecated("pbkdf2-sha256")).to.be.true;
    });
  });
});
