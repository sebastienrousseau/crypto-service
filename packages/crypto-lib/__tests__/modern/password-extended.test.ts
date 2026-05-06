import { expect } from "chai";
import {
  hashPassword,
  verifyPassword,
  verifyPasswordPhc,
} from "../../src/modern/password";

describe("Argon2 Extended (variants + PHC format)", () => {
  describe("Argon2id (default)", () => {
    it("should produce a PHC string", () => {
      const result = hashPassword({ password: "test-password" });
      expect(result.phc).to.match(/^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$/);
      expect(result.algorithm).to.equal("argon2id");
    });

    it("should verify via PHC string", () => {
      const result = hashPassword({ password: "my-secret", memoryCost: 1024, timeCost: 1 });
      const verified = verifyPasswordPhc({ password: "my-secret", phc: result.phc });
      expect(verified.valid).to.be.true;
    });

    it("should reject wrong password via PHC", () => {
      const result = hashPassword({ password: "my-secret", memoryCost: 1024, timeCost: 1 });
      const verified = verifyPasswordPhc({ password: "wrong", phc: result.phc });
      expect(verified.valid).to.be.false;
    });
  });

  describe("Argon2i", () => {
    it("should hash with argon2i variant", () => {
      const result = hashPassword({ password: "test", variant: "argon2i" });
      expect(result.algorithm).to.equal("argon2i");
      expect(result.phc).to.include("$argon2i$");
    });

    it("should verify argon2i hash", () => {
      const result = hashPassword({ password: "test", variant: "argon2i", memoryCost: 1024, timeCost: 1 });
      const verified = verifyPassword({
        password: "test",
        hash: result.hash,
        salt: result.salt,
        params: result.params,
        variant: "argon2i",
      });
      expect(verified.valid).to.be.true;
    });

    it("should verify argon2i via PHC", () => {
      const result = hashPassword({ password: "test", variant: "argon2i", memoryCost: 1024, timeCost: 1 });
      const verified = verifyPasswordPhc({ password: "test", phc: result.phc });
      expect(verified.valid).to.be.true;
    });
  });

  describe("Argon2d", () => {
    it("should hash with argon2d variant", () => {
      const result = hashPassword({ password: "test", variant: "argon2d" });
      expect(result.algorithm).to.equal("argon2d");
      expect(result.phc).to.include("$argon2d$");
    });

    it("should verify argon2d hash", () => {
      const result = hashPassword({ password: "test", variant: "argon2d", memoryCost: 1024, timeCost: 1 });
      const verified = verifyPassword({
        password: "test",
        hash: result.hash,
        salt: result.salt,
        params: result.params,
        variant: "argon2d",
      });
      expect(verified.valid).to.be.true;
    });
  });

  describe("Custom parameters", () => {
    it("should respect custom time/memory/parallelism", () => {
      const result = hashPassword({
        password: "test",
        timeCost: 2,
        memoryCost: 1024,
        parallelism: 2,
        hashLength: 16,
      });
      expect(result.params.t).to.equal(2);
      expect(result.params.m).to.equal(1024);
      expect(result.params.p).to.equal(2);
      expect(result.hash).to.have.length(32); // 16 bytes = 32 hex
    });
  });

  describe("PHC string parsing errors", () => {
    it("should reject invalid PHC format", () => {
      expect(() => verifyPasswordPhc({ password: "x", phc: "invalid" })).to.throw(
        "Invalid PHC string format",
      );
    });

    it("should reject unsupported variant in PHC", () => {
      expect(() =>
        verifyPasswordPhc({ password: "x", phc: "$bcrypt$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA" }),
      ).to.throw("Unsupported variant");
    });
  });

  describe("Unsupported variant", () => {
    it("should reject unknown variant", () => {
      expect(() => hashPassword({ password: "x", variant: "argon2x" as never })).to.throw(
        "Unsupported Argon2 variant",
      );
    });
  });
});
