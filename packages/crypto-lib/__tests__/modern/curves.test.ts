import { expect } from "chai";
import {
  generateP256KeyPair,
  p256Sign,
  p256Verify,
  generateP384KeyPair,
  p384Sign,
  p384Verify,
  generateEd448KeyPair,
  ed448Sign,
  ed448Verify,
  generateX448KeyPair,
  x448Exchange,
  ecdhP256,
  ecdhP384,
} from "../../src/modern/curves";

describe("Curves", () => {
  describe("P-256 (ECDSA)", () => {
    it("should generate a key pair", () => {
      const kp = generateP256KeyPair();
      expect(kp.algorithm).to.equal("ecdsa-p256");
      expect(kp.privateKey).to.match(/^[0-9a-f]+$/);
      expect(kp.publicKey).to.match(/^[0-9a-f]+$/);
    });

    it("should sign and verify", () => {
      const kp = generateP256KeyPair();
      const sig = p256Sign(kp.privateKey, "hello p256");
      expect(sig.algorithm).to.equal("ecdsa-p256");
      const result = p256Verify(kp.publicKey, "hello p256", sig.signature);
      expect(result.valid).to.be.true;
      expect(result.algorithm).to.equal("ecdsa-p256");
    });

    it("should reject wrong message", () => {
      const kp = generateP256KeyPair();
      const sig = p256Sign(kp.privateKey, "hello");
      const result = p256Verify(kp.publicKey, "wrong", sig.signature);
      expect(result.valid).to.be.false;
    });

    it("should accept Uint8Array message", () => {
      const kp = generateP256KeyPair();
      const msg = new Uint8Array([1, 2, 3]);
      const sig = p256Sign(kp.privateKey, msg);
      const result = p256Verify(kp.publicKey, msg, sig.signature);
      expect(result.valid).to.be.true;
    });
  });

  describe("P-384 (ECDSA)", () => {
    it("should generate a key pair", () => {
      const kp = generateP384KeyPair();
      expect(kp.algorithm).to.equal("ecdsa-p384");
      expect(kp.privateKey).to.match(/^[0-9a-f]+$/);
    });

    it("should sign and verify", () => {
      const kp = generateP384KeyPair();
      const sig = p384Sign(kp.privateKey, "hello p384");
      expect(sig.algorithm).to.equal("ecdsa-p384");
      const result = p384Verify(kp.publicKey, "hello p384", sig.signature);
      expect(result.valid).to.be.true;
    });

    it("should reject wrong message", () => {
      const kp = generateP384KeyPair();
      const sig = p384Sign(kp.privateKey, "hello");
      const result = p384Verify(kp.publicKey, "wrong", sig.signature);
      expect(result.valid).to.be.false;
    });
  });

  describe("Ed448", () => {
    it("should generate a key pair", () => {
      const kp = generateEd448KeyPair();
      expect(kp.algorithm).to.equal("ed448");
      expect(kp.privateKey).to.match(/^[0-9a-f]+$/);
      expect(kp.publicKey).to.match(/^[0-9a-f]+$/);
    });

    it("should sign and verify", () => {
      const kp = generateEd448KeyPair();
      const sig = ed448Sign(kp.privateKey, "hello ed448");
      expect(sig.algorithm).to.equal("ed448");
      const result = ed448Verify(kp.publicKey, "hello ed448", sig.signature);
      expect(result.valid).to.be.true;
    });

    it("should reject wrong message", () => {
      const kp = generateEd448KeyPair();
      const sig = ed448Sign(kp.privateKey, "hello");
      const result = ed448Verify(kp.publicKey, "wrong", sig.signature);
      expect(result.valid).to.be.false;
    });

    it("should accept Uint8Array message", () => {
      const kp = generateEd448KeyPair();
      const msg = new Uint8Array([10, 20, 30]);
      const sig = ed448Sign(kp.privateKey, msg);
      const result = ed448Verify(kp.publicKey, msg, sig.signature);
      expect(result.valid).to.be.true;
    });
  });

  describe("X448 (DH)", () => {
    it("should generate a key pair", () => {
      const kp = generateX448KeyPair();
      expect(kp.algorithm).to.equal("x448");
      expect(kp.privateKey).to.match(/^[0-9a-f]+$/);
      expect(kp.publicKey).to.match(/^[0-9a-f]+$/);
    });

    it("should compute shared secret", () => {
      const alice = generateX448KeyPair();
      const bob = generateX448KeyPair();
      const secretA = x448Exchange(alice.privateKey, bob.publicKey);
      const secretB = x448Exchange(bob.privateKey, alice.publicKey);
      expect(secretA.sharedSecret).to.equal(secretB.sharedSecret);
      expect(secretA.algorithm).to.equal("x448");
    });
  });

  describe("ECDH P-256", () => {
    it("should compute shared secret", () => {
      const alice = generateP256KeyPair();
      const bob = generateP256KeyPair();
      const secretA = ecdhP256(alice.privateKey, bob.publicKey);
      const secretB = ecdhP256(bob.privateKey, alice.publicKey);
      expect(secretA.sharedSecret).to.equal(secretB.sharedSecret);
      expect(secretA.algorithm).to.equal("ecdh-p256");
    });
  });

  describe("invalid hex inputs", () => {
    it("should reject invalid hex in assertHex", () => {
      expect(() => p256Sign("zzzz", "msg")).to.throw(/Invalid hex/);
      expect(() => p256Verify("zzzz", "msg", "aa")).to.throw(/Invalid hex/);
    });
  });

  describe("ECDH P-384", () => {
    it("should compute shared secret", () => {
      const alice = generateP384KeyPair();
      const bob = generateP384KeyPair();
      const secretA = ecdhP384(alice.privateKey, bob.publicKey);
      const secretB = ecdhP384(bob.privateKey, alice.publicKey);
      expect(secretA.sharedSecret).to.equal(secretB.sharedSecret);
      expect(secretA.algorithm).to.equal("ecdh-p384");
    });
  });
});
