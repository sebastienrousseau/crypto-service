import { expect } from "chai";
import { crypto } from "../src/crypto";
import { generateKeyPair } from "../src/keys/keygen";
import { generateSchnorrKeyPair } from "../src/modern/curves";
import { hashPassword as hashPw } from "../src/modern/password";

describe("Unified crypto API (expanded)", () => {
  describe("sign/verify with all algorithms", () => {
    it("should sign and verify with ed25519", () => {
      const kp = generateKeyPair("ed25519");
      const sig = crypto.sign("ed25519", kp.privateKey, "hello");
      const valid = crypto.verify("ed25519", kp.publicKey, "hello", sig);
      expect(valid).to.be.true;
    });

    it("should sign and verify with ed448", () => {
      const kp = generateKeyPair("ed448");
      const sig = crypto.sign("ed448", kp.privateKey, "hello");
      const valid = crypto.verify("ed448", kp.publicKey, "hello", sig);
      expect(valid).to.be.true;
    });

    it("should sign and verify with ecdsa-p256", () => {
      const kp = generateKeyPair("p256");
      const sig = crypto.sign("ecdsa-p256", kp.privateKey, "hello");
      const valid = crypto.verify("ecdsa-p256", kp.publicKey, "hello", sig);
      expect(valid).to.be.true;
    });

    it("should sign and verify with ecdsa-p384", () => {
      const kp = generateKeyPair("p384");
      const sig = crypto.sign("ecdsa-p384", kp.privateKey, "hello");
      const valid = crypto.verify("ecdsa-p384", kp.publicKey, "hello", sig);
      expect(valid).to.be.true;
    });

    it("should sign and verify with schnorr", () => {
      const kp = generateSchnorrKeyPair();
      const sig = crypto.sign("schnorr", kp.privateKey, "hello");
      const valid = crypto.verify("schnorr", kp.publicKey, "hello", sig);
      expect(valid).to.be.true;
    });

    it("should sign and verify with ml-dsa-44", () => {
      const kp = generateKeyPair("ml-dsa-44");
      const sig = crypto.sign("ml-dsa-44", kp.privateKey, "hello");
      const valid = crypto.verify("ml-dsa-44", kp.publicKey, "hello", sig);
      expect(valid).to.be.true;
    });

    it("should sign and verify with ml-dsa-65", () => {
      const kp = generateKeyPair("ml-dsa-65");
      const sig = crypto.sign("ml-dsa-65", kp.privateKey, "hello");
      const valid = crypto.verify("ml-dsa-65", kp.publicKey, "hello", sig);
      expect(valid).to.be.true;
    });

    it("should sign and verify with ml-dsa-87", () => {
      const kp = generateKeyPair("ml-dsa-87");
      const sig = crypto.sign("ml-dsa-87", kp.privateKey, "hello");
      const valid = crypto.verify("ml-dsa-87", kp.publicKey, "hello", sig);
      expect(valid).to.be.true;
    });

    it("should throw for unsupported sign algorithm", () => {
      expect(() => crypto.sign("invalid" as never, "aa", "hello")).to.throw(
        "Unsupported signing algorithm",
      );
    });

    it("should throw for unsupported verify algorithm", () => {
      expect(() =>
        crypto.verify("invalid" as never, "aa", "hello", "bb"),
      ).to.throw("Unsupported verify algorithm");
    });
  });

  describe("verifyPasswordPhc", () => {
    it("should hash and verify via PHC", () => {
      // Use low-cost params to avoid timeout
      const result = hashPw({ password: "my-password", memoryCost: 1024, timeCost: 1 });
      const verified = crypto.verifyPasswordPhc("my-password", result.phc);
      expect(verified.valid).to.be.true;
    });

    it("should reject wrong password via PHC", () => {
      const result = hashPw({ password: "my-password", memoryCost: 1024, timeCost: 1 });
      const verified = crypto.verifyPasswordPhc("wrong", result.phc);
      expect(verified.valid).to.be.false;
    });
  });
});
