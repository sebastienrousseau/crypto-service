/**
 * Tests for modern crypto primitives (noble-based).
 */
import { expect } from "chai";
import {
  aeadEncrypt,
  aeadDecrypt,
  hash,
  HASH_ALGORITHMS,
  kdfDerive,
  KDF_ALGORITHMS,
  generateEd25519KeyPair,
  ed25519Sign,
  ed25519Verify,
  generateX25519KeyPair,
  x25519Exchange,
  SUPPORTED_ALGORITHMS,
} from "../../src/modern";

describe("Modern Crypto Primitives", () => {
  describe("AEAD (XChaCha20-Poly1305)", () => {
    const key = "a".repeat(64); // 32-byte hex key

    it("should encrypt and decrypt a message", () => {
      const result = aeadEncrypt({ key, plaintext: "Hello, World!" });
      expect(result.algorithm).to.equal("xchacha20-poly1305");
      expect(result.ciphertext).to.be.a("string");

      const decrypted = aeadDecrypt({ key, ciphertext: result.ciphertext });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("Hello, World!");
    });

    it("should produce different ciphertexts for same plaintext (random nonce)", () => {
      const r1 = aeadEncrypt({ key, plaintext: "same" });
      const r2 = aeadEncrypt({ key, plaintext: "same" });
      expect(r1.ciphertext).to.not.equal(r2.ciphertext);
    });

    it("should reject wrong key during decrypt", () => {
      const result = aeadEncrypt({ key, plaintext: "secret" });
      const wrongKey = "b".repeat(64);
      expect(() => aeadDecrypt({ key: wrongKey, ciphertext: result.ciphertext })).to.throw();
    });

    it("should reject invalid key length", () => {
      // Use valid hex that is too short (16 bytes instead of 32)
      expect(() => aeadEncrypt({ key: "aa".repeat(16), plaintext: "test" })).to.throw(/32 bytes/);
    });

    it("should reject too-short ciphertext", () => {
      expect(() => aeadDecrypt({ key, ciphertext: "YQ==" })).to.throw(/too short/);
    });

    it("should support AAD (additional authenticated data)", () => {
      const aad = Buffer.from("context");
      const result = aeadEncrypt({ key, plaintext: "with aad", aad });
      const decrypted = aeadDecrypt({ key, ciphertext: result.ciphertext, aad });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("with aad");
    });

    it("should fail decryption with wrong AAD", () => {
      const aad = Buffer.from("context");
      const result = aeadEncrypt({ key, plaintext: "with aad", aad });
      const wrongAad = Buffer.from("wrong");
      expect(() => aeadDecrypt({ key, ciphertext: result.ciphertext, aad: wrongAad })).to.throw();
    });
  });

  describe("Hash", () => {
    it("should compute SHA-256", () => {
      const result = hash({ algorithm: "sha256", data: "hello" });
      expect(result.algorithm).to.equal("sha256");
      expect(result.digest).to.have.length(64); // 32 bytes hex
      expect(result.length).to.equal(32);
    });

    it("should compute all supported algorithms", () => {
      for (const algo of HASH_ALGORITHMS) {
        const result = hash({ algorithm: algo, data: "test" });
        expect(result.algorithm).to.equal(algo);
        expect(result.digest).to.be.a("string");
        expect(result.length).to.be.greaterThan(0);
      }
    });

    it("should produce deterministic output", () => {
      const r1 = hash({ algorithm: "sha256", data: "same" });
      const r2 = hash({ algorithm: "sha256", data: "same" });
      expect(r1.digest).to.equal(r2.digest);
    });

    it("should produce different output for different inputs", () => {
      const r1 = hash({ algorithm: "sha256", data: "a" });
      const r2 = hash({ algorithm: "sha256", data: "b" });
      expect(r1.digest).to.not.equal(r2.digest);
    });

    it("should reject unsupported algorithm", () => {
      expect(() => hash({ algorithm: "md5" as never, data: "test" })).to.throw(/Unsupported/);
    });
  });

  describe("KDF", () => {
    it("should derive a key with scrypt", () => {
      const result = kdfDerive({
        algorithm: "scrypt",
        password: "password123",
        params: { N: 1024, r: 8, p: 1 },
      });
      expect(result.algorithm).to.equal("scrypt");
      expect(result.derivedKey).to.have.length(64); // 32 bytes hex
      expect(result.salt).to.be.a("string");
      expect(result.keyLength).to.equal(32);
    });

    it("should derive with HKDF-SHA256", () => {
      const result = kdfDerive({
        algorithm: "hkdf-sha256",
        password: "input-key-material",
        salt: "aa".repeat(16),
        params: { info: "context" },
      });
      expect(result.algorithm).to.equal("hkdf-sha256");
      expect(result.derivedKey).to.have.length(64);
    });

    it("should derive with PBKDF2-SHA256", () => {
      const result = kdfDerive({
        algorithm: "pbkdf2-sha256",
        password: "password",
        params: { iterations: 1000 },
      });
      expect(result.algorithm).to.equal("pbkdf2-sha256");
      expect(result.derivedKey).to.have.length(64);
    });

    it("should generate random salt if not provided", () => {
      const r1 = kdfDerive({ algorithm: "scrypt", password: "p", params: { N: 1024, r: 8, p: 1 } });
      const r2 = kdfDerive({ algorithm: "scrypt", password: "p", params: { N: 1024, r: 8, p: 1 } });
      expect(r1.salt).to.not.equal(r2.salt);
    });

    it("should produce same key for same salt", () => {
      const salt = "bb".repeat(16);
      const r1 = kdfDerive({ algorithm: "scrypt", password: "p", salt, params: { N: 1024, r: 8, p: 1 } });
      const r2 = kdfDerive({ algorithm: "scrypt", password: "p", salt, params: { N: 1024, r: 8, p: 1 } });
      expect(r1.derivedKey).to.equal(r2.derivedKey);
    });

    it("should support all KDF algorithms", () => {
      for (const algo of KDF_ALGORITHMS) {
        const result = kdfDerive({
          algorithm: algo,
          password: "test",
          ...(algo === "scrypt" ? { params: { N: 1024, r: 8, p: 1 } } : {}),
          ...(algo === "pbkdf2-sha256" ? { params: { iterations: 1000 } } : {}),
        });
        expect(result.algorithm).to.equal(algo);
      }
    });
  });

  describe("Ed25519 Signing", () => {
    it("should generate a key pair", () => {
      const kp = generateEd25519KeyPair();
      expect(kp.privateKey).to.have.length(64);
      expect(kp.publicKey).to.have.length(64);
    });

    it("should sign and verify a message", () => {
      const kp = generateEd25519KeyPair();
      const sig = ed25519Sign(kp.privateKey, "Hello");
      expect(sig.algorithm).to.equal("ed25519");
      expect(sig.signature).to.have.length(128); // 64 bytes hex

      const result = ed25519Verify(kp.publicKey, "Hello", sig.signature);
      expect(result.valid).to.be.true;
    });

    it("should reject tampered message", () => {
      const kp = generateEd25519KeyPair();
      const sig = ed25519Sign(kp.privateKey, "Original");
      const result = ed25519Verify(kp.publicKey, "Tampered", sig.signature);
      expect(result.valid).to.be.false;
    });

    it("should reject wrong public key", () => {
      const kp1 = generateEd25519KeyPair();
      const kp2 = generateEd25519KeyPair();
      const sig = ed25519Sign(kp1.privateKey, "msg");
      const result = ed25519Verify(kp2.publicKey, "msg", sig.signature);
      expect(result.valid).to.be.false;
    });
  });

  describe("X25519 Key Exchange", () => {
    it("should generate a key pair", () => {
      const kp = generateX25519KeyPair();
      expect(kp.privateKey).to.have.length(64);
      expect(kp.publicKey).to.have.length(64);
    });

    it("should derive same shared secret from both sides", () => {
      const alice = generateX25519KeyPair();
      const bob = generateX25519KeyPair();

      const sharedAlice = x25519Exchange(alice.privateKey, bob.publicKey);
      const sharedBob = x25519Exchange(bob.privateKey, alice.publicKey);

      expect(sharedAlice.sharedSecret).to.equal(sharedBob.sharedSecret);
      expect(sharedAlice.algorithm).to.equal("x25519");
    });

    it("should produce different secrets for different key pairs", () => {
      const alice = generateX25519KeyPair();
      const bob = generateX25519KeyPair();
      const eve = generateX25519KeyPair();

      const s1 = x25519Exchange(alice.privateKey, bob.publicKey);
      const s2 = x25519Exchange(alice.privateKey, eve.publicKey);
      expect(s1.sharedSecret).to.not.equal(s2.sharedSecret);
    });
  });

  describe("SUPPORTED_ALGORITHMS constant", () => {
    it("should list all algorithm categories", () => {
      expect(SUPPORTED_ALGORITHMS).to.have.property("encryption");
      expect(SUPPORTED_ALGORITHMS).to.have.property("hashing");
      expect(SUPPORTED_ALGORITHMS).to.have.property("kdf");
      expect(SUPPORTED_ALGORITHMS).to.have.property("signing");
      expect(SUPPORTED_ALGORITHMS).to.have.property("keyExchange");
    });
  });
});
