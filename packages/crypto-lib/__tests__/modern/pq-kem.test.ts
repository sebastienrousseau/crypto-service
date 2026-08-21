/**
 * Tests for ML-KEM (FIPS 203) key encapsulation — all levels + hybrid.
 */
import { expect } from "chai";
import {
  mlKemKeygen,
  mlKemEncapsulate,
  mlKemDecapsulate,
  hybridKemKeygen,
  hybridKemEncapsulate,
  hybridKemDecapsulate,
  MlKemLevel,
} from "../../src/modern/pq-kem";

describe("ML-KEM (FIPS 203)", function () {
  this.timeout(30000);

  const levels: MlKemLevel[] = [512, 768, 1024];

  describe("mlKemKeygen", () => {
    for (const level of levels) {
      it(`should generate a key pair for ML-KEM-${level}`, () => {
        const kp = mlKemKeygen(level);
        expect(kp.algorithm).to.equal(`ml-kem-${level}`);
        expect(kp.publicKey).to.be.a("string");
        expect(kp.secretKey).to.be.a("string");
        // Public key length varies by level; all should be > 1000 hex chars
        expect(kp.publicKey.length).to.be.greaterThan(1000);
        expect(kp.secretKey.length).to.be.greaterThan(1000);
      });
    }

    it("should generate different key pairs each time", () => {
      const kp1 = mlKemKeygen(512);
      const kp2 = mlKemKeygen(512);
      expect(kp1.publicKey).to.not.equal(kp2.publicKey);
      expect(kp1.secretKey).to.not.equal(kp2.secretKey);
    });

    it("should throw for unsupported level", () => {
      expect(() => mlKemKeygen(256 as MlKemLevel)).to.throw(/Unsupported/);
    });
  });

  describe("mlKemEncapsulate + mlKemDecapsulate roundtrip", () => {
    for (const level of levels) {
      it(`should encapsulate and decapsulate for ML-KEM-${level}`, () => {
        const kp = mlKemKeygen(level);
        const enc = mlKemEncapsulate(level, kp.publicKey);
        expect(enc.algorithm).to.equal(`ml-kem-${level}`);
        expect(enc.sharedSecret).to.have.length(64); // 32 bytes hex
        expect(enc.ciphertext).to.be.a("string");

        const dec = mlKemDecapsulate(level, kp.secretKey, enc.ciphertext);
        expect(dec.algorithm).to.equal(`ml-kem-${level}`);
        expect(dec.sharedSecret).to.equal(enc.sharedSecret);
      });
    }

    it("should produce different shared secrets per encapsulation", () => {
      const kp = mlKemKeygen(768);
      const enc1 = mlKemEncapsulate(768, kp.publicKey);
      const enc2 = mlKemEncapsulate(768, kp.publicKey);
      expect(enc1.sharedSecret).to.not.equal(enc2.sharedSecret);
      expect(enc1.ciphertext).to.not.equal(enc2.ciphertext);
    });

    it("should fail decapsulation with wrong secret key", () => {
      const kp1 = mlKemKeygen(768);
      const kp2 = mlKemKeygen(768);
      const enc = mlKemEncapsulate(768, kp1.publicKey);
      // Wrong key yields a different shared secret (ML-KEM implicit rejection)
      const dec = mlKemDecapsulate(768, kp2.secretKey, enc.ciphertext);
      expect(dec.sharedSecret).to.not.equal(enc.sharedSecret);
    });
  });

  describe("invalid inputs", () => {
    it("should throw for invalid hex in publicKey", () => {
      expect(() => mlKemEncapsulate(768, "ZZZZ")).to.throw(/Invalid hex/);
    });

    it("should throw for invalid hex in secretKey", () => {
      expect(() => mlKemDecapsulate(768, "ZZZZ", "aabb")).to.throw(
        /Invalid hex/,
      );
    });

    it("should throw for invalid hex in ciphertext", () => {
      const kp = mlKemKeygen(768);
      expect(() => mlKemDecapsulate(768, kp.secretKey, "not-hex!")).to.throw(
        /Invalid hex/,
      );
    });
  });

  describe("Hybrid X25519 + ML-KEM", () => {
    for (const level of levels) {
      it(`should generate a hybrid key pair for level ${level}`, () => {
        const kp = hybridKemKeygen(level);
        expect(kp.algorithm).to.equal(`x25519-ml-kem-${level}`);
        expect(kp.x25519PrivateKey).to.have.length(64); // 32 bytes hex
        expect(kp.x25519PublicKey).to.have.length(64);
        expect(kp.mlKemPublicKey).to.be.a("string");
        expect(kp.mlKemSecretKey).to.be.a("string");
      });
    }

    it("should default to level 768", () => {
      const kp = hybridKemKeygen();
      expect(kp.algorithm).to.equal("x25519-ml-kem-768");
    });

    for (const level of levels) {
      it(`should encapsulate and decapsulate hybrid for level ${level}`, () => {
        const recipient = hybridKemKeygen(level);

        const enc = hybridKemEncapsulate(
          level,
          recipient.x25519PublicKey,
          recipient.mlKemPublicKey,
        );
        expect(enc.algorithm).to.equal(`x25519-ml-kem-${level}`);
        expect(enc.sharedSecret).to.have.length(64);
        expect(enc.x25519EphemeralPublic).to.have.length(64);
        expect(enc.mlKemCiphertext).to.be.a("string");

        const dec = hybridKemDecapsulate(
          level,
          recipient.x25519PrivateKey,
          recipient.mlKemSecretKey,
          enc.x25519EphemeralPublic,
          enc.mlKemCiphertext,
        );
        expect(dec.sharedSecret).to.equal(enc.sharedSecret);
        expect(dec.algorithm).to.equal(`x25519-ml-kem-${level}`);
      });
    }

    it("should produce different secrets for different recipients", () => {
      const alice = hybridKemKeygen(768);
      const bob = hybridKemKeygen(768);

      const toAlice = hybridKemEncapsulate(
        768,
        alice.x25519PublicKey,
        alice.mlKemPublicKey,
      );
      const toBob = hybridKemEncapsulate(
        768,
        bob.x25519PublicKey,
        bob.mlKemPublicKey,
      );
      expect(toAlice.sharedSecret).to.not.equal(toBob.sharedSecret);
    });

    it("should throw for invalid hex in hybrid encapsulate", () => {
      expect(() =>
        hybridKemEncapsulate(768, "not-hex!", "aabb"),
      ).to.throw(/Invalid hex/);
    });

    it("should throw for invalid hex in hybrid decapsulate", () => {
      expect(() =>
        hybridKemDecapsulate(768, "not-hex!", "aabb", "ccdd", "eeff"),
      ).to.throw(/Invalid hex/);
    });
  });
});
