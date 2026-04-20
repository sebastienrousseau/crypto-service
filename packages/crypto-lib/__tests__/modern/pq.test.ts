/**
 * Tests for post-quantum cryptography (ML-KEM-768 + hybrid).
 */
import { expect } from "chai";
import {
  mlKemGenerateKeyPair,
  mlKemEncapsulate,
  mlKemDecapsulate,
  hybridGenerateKeyPair,
  hybridEncapsulate,
  hybridDecapsulate,
} from "../../src/modern";

describe("Post-Quantum Cryptography", function () {
  this.timeout(30000); // ML-KEM key gen can be slow

  describe("ML-KEM-768 (standalone)", () => {
    it("should generate a key pair", () => {
      const kp = mlKemGenerateKeyPair();
      expect(kp.algorithm).to.equal("ml-kem-768");
      expect(kp.publicKey).to.be.a("string");
      expect(kp.secretKey).to.be.a("string");
      // ML-KEM-768 public key is 1184 bytes = 2368 hex chars
      expect(kp.publicKey.length).to.be.greaterThan(2000);
    });

    it("should encapsulate and decapsulate to same shared secret", () => {
      const kp = mlKemGenerateKeyPair();
      const enc = mlKemEncapsulate(kp.publicKey);
      expect(enc.algorithm).to.equal("ml-kem-768");
      expect(enc.sharedSecret).to.have.length(64); // 32 bytes hex

      const dec = mlKemDecapsulate(kp.secretKey, enc.ciphertext);
      expect(dec.sharedSecret).to.equal(enc.sharedSecret);
    });

    it("should produce different shared secrets for each encapsulation", () => {
      const kp = mlKemGenerateKeyPair();
      const enc1 = mlKemEncapsulate(kp.publicKey);
      const enc2 = mlKemEncapsulate(kp.publicKey);
      expect(enc1.sharedSecret).to.not.equal(enc2.sharedSecret);
    });
  });

  describe("Hybrid X25519 + ML-KEM-768", () => {
    it("should generate a hybrid key pair", () => {
      const kp = hybridGenerateKeyPair();
      expect(kp.algorithm).to.equal("x25519-ml-kem-768");
      expect(kp.x25519PrivateKey).to.have.length(64);
      expect(kp.x25519PublicKey).to.have.length(64);
      expect(kp.mlKemPublicKey).to.be.a("string");
      expect(kp.mlKemSecretKey).to.be.a("string");
    });

    it("should derive same shared secret from both sides", () => {
      const recipient = hybridGenerateKeyPair();

      const encResult = hybridEncapsulate(
        recipient.x25519PublicKey,
        recipient.mlKemPublicKey,
      );
      expect(encResult.algorithm).to.equal("x25519-ml-kem-768");
      expect(encResult.sharedSecret).to.have.length(64);

      const decResult = hybridDecapsulate(
        recipient.x25519PrivateKey,
        recipient.mlKemSecretKey,
        encResult.x25519EphemeralPublic,
        encResult.mlKemCiphertext,
      );
      expect(decResult.sharedSecret).to.equal(encResult.sharedSecret);
    });

    it("should produce different secrets for different recipients", () => {
      const alice = hybridGenerateKeyPair();
      const bob = hybridGenerateKeyPair();

      const toAlice = hybridEncapsulate(alice.x25519PublicKey, alice.mlKemPublicKey);
      const toBob = hybridEncapsulate(bob.x25519PublicKey, bob.mlKemPublicKey);
      expect(toAlice.sharedSecret).to.not.equal(toBob.sharedSecret);
    });
  });
});
