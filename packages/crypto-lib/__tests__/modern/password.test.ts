import { expect } from "chai";
import { hashPassword, verifyPassword } from "../../src/modern/password";

describe("Argon2id Password Hashing", () => {
  // Use minimal params so tests run fast
  const fastParams = { timeCost: 1, memoryCost: 1024, parallelism: 1 };

  describe("hashPassword", () => {
    it("should hash a password with default params", () => {
      const result = hashPassword({ password: "test123", ...fastParams });
      expect(result.algorithm).to.equal("argon2id");
      expect(result.hash).to.match(/^[0-9a-f]+$/);
      expect(result.salt).to.match(/^[0-9a-f]+$/);
      expect(result.params.t).to.equal(1);
      expect(result.params.m).to.equal(1024);
      expect(result.params.p).to.equal(1);
    });

    it("should produce deterministic output with same salt", () => {
      const salt = "aa".repeat(16);
      const r1 = hashPassword({ password: "test", salt, ...fastParams });
      const r2 = hashPassword({ password: "test", salt, ...fastParams });
      expect(r1.hash).to.equal(r2.hash);
    });

    it("should produce different output with different passwords", () => {
      const salt = "bb".repeat(16);
      const r1 = hashPassword({ password: "aaa", salt, ...fastParams });
      const r2 = hashPassword({ password: "bbb", salt, ...fastParams });
      expect(r1.hash).to.not.equal(r2.hash);
    });

    it("should accept Uint8Array password", () => {
      const result = hashPassword({
        password: new Uint8Array([1, 2, 3]),
        ...fastParams,
      });
      expect(result.hash).to.be.a("string");
    });

    it("should accept Uint8Array salt", () => {
      const salt = new Uint8Array(16).fill(0xcc);
      const result = hashPassword({ password: "test", salt, ...fastParams });
      expect(result.hash).to.be.a("string");
    });

    it("should support custom hash length", () => {
      const result = hashPassword({
        password: "test",
        hashLength: 64,
        ...fastParams,
      });
      expect(result.hash).to.have.length(128); // 64 bytes = 128 hex
    });

    it("should generate random salt when not provided", () => {
      const r1 = hashPassword({ password: "test", ...fastParams });
      const r2 = hashPassword({ password: "test", ...fastParams });
      expect(r1.salt).to.not.equal(r2.salt);
    });
  });

  describe("invalid inputs", () => {
    it("should reject invalid hex salt", () => {
      expect(() =>
        hashPassword({ password: "test", salt: "zzzz", ...fastParams }),
      ).to.throw(/Invalid hex/);
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", () => {
      const hashed = hashPassword({ password: "correct", ...fastParams });
      const result = verifyPassword({
        password: "correct",
        hash: hashed.hash,
        salt: hashed.salt,
        params: hashed.params,
      });
      expect(result.valid).to.be.true;
    });

    it("should reject wrong password", () => {
      const hashed = hashPassword({ password: "correct", ...fastParams });
      const result = verifyPassword({
        password: "wrong",
        hash: hashed.hash,
        salt: hashed.salt,
        params: hashed.params,
      });
      expect(result.valid).to.be.false;
    });

    it("should accept Uint8Array password for verification", () => {
      const pw = new Uint8Array([10, 20, 30]);
      const hashed = hashPassword({ password: pw, ...fastParams });
      const result = verifyPassword({
        password: pw,
        hash: hashed.hash,
        salt: hashed.salt,
        params: hashed.params,
      });
      expect(result.valid).to.be.true;
    });
  });
});
