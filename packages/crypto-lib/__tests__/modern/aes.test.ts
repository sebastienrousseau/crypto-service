/**
 * Tests for AES-GCM and AES-GCM-SIV encryption/decryption.
 */
import { expect } from "chai";
import {
  aesGcmEncrypt,
  aesGcmDecrypt,
  aesGcmSivEncrypt,
  aesGcmSivDecrypt,
} from "../../src/modern/aes";

describe("AES-GCM", () => {
  // 256-bit key (32 bytes = 64 hex chars)
  const key256 = "a".repeat(64);
  // 128-bit key (16 bytes = 32 hex chars)
  const key128 = "b".repeat(32);

  describe("aesGcmEncrypt + aesGcmDecrypt roundtrip", () => {
    it("should encrypt and decrypt with a 256-bit key", () => {
      const result = aesGcmEncrypt({ key: key256, plaintext: "Hello, AES!" });
      expect(result.algorithm).to.equal("aes-256-gcm");
      expect(result.ciphertext).to.be.a("string");

      const decrypted = aesGcmDecrypt({
        key: key256,
        ciphertext: result.ciphertext,
      });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("Hello, AES!");
    });

    it("should encrypt and decrypt with a 128-bit key", () => {
      const result = aesGcmEncrypt({ key: key128, plaintext: "Hello, 128!" });
      expect(result.algorithm).to.equal("aes-128-gcm");
      expect(result.ciphertext).to.be.a("string");

      const decrypted = aesGcmDecrypt({
        key: key128,
        ciphertext: result.ciphertext,
      });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("Hello, 128!");
    });

    it("should handle empty plaintext", () => {
      const result = aesGcmEncrypt({ key: key256, plaintext: "" });
      const decrypted = aesGcmDecrypt({
        key: key256,
        ciphertext: result.ciphertext,
      });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("");
    });

    it("should handle Uint8Array plaintext", () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const result = aesGcmEncrypt({ key: key256, plaintext });
      const decrypted = aesGcmDecrypt({
        key: key256,
        ciphertext: result.ciphertext,
      });
      expect(Buffer.from(decrypted)).to.deep.equal(Buffer.from(plaintext));
    });

    it("should handle Uint8Array key", () => {
      const keyBytes = new Uint8Array(32).fill(0xaa);
      const result = aesGcmEncrypt({ key: keyBytes, plaintext: "bytes key" });
      expect(result.algorithm).to.equal("aes-256-gcm");
      const decrypted = aesGcmDecrypt({
        key: keyBytes,
        ciphertext: result.ciphertext,
      });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("bytes key");
    });
  });

  describe("random nonce", () => {
    it("should produce different ciphertexts for same plaintext", () => {
      const r1 = aesGcmEncrypt({ key: key256, plaintext: "same" });
      const r2 = aesGcmEncrypt({ key: key256, plaintext: "same" });
      expect(r1.ciphertext).to.not.equal(r2.ciphertext);
    });
  });

  describe("AAD support", () => {
    it("should encrypt and decrypt with AAD", () => {
      const aad = Buffer.from("additional-context");
      const result = aesGcmEncrypt({
        key: key256,
        plaintext: "with aad",
        aad,
      });
      const decrypted = aesGcmDecrypt({
        key: key256,
        ciphertext: result.ciphertext,
        aad,
      });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("with aad");
    });

    it("should fail decryption with wrong AAD", () => {
      const aad = Buffer.from("correct");
      const result = aesGcmEncrypt({
        key: key256,
        plaintext: "with aad",
        aad,
      });
      const wrongAad = Buffer.from("wrong");
      expect(() =>
        aesGcmDecrypt({
          key: key256,
          ciphertext: result.ciphertext,
          aad: wrongAad,
        }),
      ).to.throw();
    });

    it("should fail decryption with missing AAD", () => {
      const aad = Buffer.from("context");
      const result = aesGcmEncrypt({
        key: key256,
        plaintext: "with aad",
        aad,
      });
      expect(() =>
        aesGcmDecrypt({ key: key256, ciphertext: result.ciphertext }),
      ).to.throw();
    });
  });

  describe("wrong key rejection", () => {
    it("should fail decryption with wrong 256-bit key", () => {
      const result = aesGcmEncrypt({ key: key256, plaintext: "secret" });
      const wrongKey = "c".repeat(64);
      expect(() =>
        aesGcmDecrypt({ key: wrongKey, ciphertext: result.ciphertext }),
      ).to.throw();
    });

    it("should fail decryption with wrong 128-bit key", () => {
      const result = aesGcmEncrypt({ key: key128, plaintext: "secret" });
      const wrongKey = "d".repeat(32);
      expect(() =>
        aesGcmDecrypt({ key: wrongKey, ciphertext: result.ciphertext }),
      ).to.throw();
    });
  });

  describe("invalid key length", () => {
    it("should reject 192-bit key (24 bytes)", () => {
      expect(() =>
        aesGcmEncrypt({ key: "a".repeat(48), plaintext: "test" }),
      ).to.throw(/16 bytes.*32 bytes/);
    });

    it("should reject too-short key (8 bytes)", () => {
      expect(() =>
        aesGcmEncrypt({ key: "a".repeat(16), plaintext: "test" }),
      ).to.throw(/16 bytes.*32 bytes/);
    });

    it("should reject too-long key (64 bytes)", () => {
      expect(() =>
        aesGcmEncrypt({ key: "a".repeat(128), plaintext: "test" }),
      ).to.throw(/16 bytes.*32 bytes/);
    });

    it("should reject invalid key length on decrypt", () => {
      const result = aesGcmEncrypt({ key: key256, plaintext: "test" });
      expect(() =>
        aesGcmDecrypt({ key: "a".repeat(48), ciphertext: result.ciphertext }),
      ).to.throw(/16 bytes.*32 bytes/);
    });
  });

  describe("invalid hex key", () => {
    it("should reject non-hex string key", () => {
      expect(() =>
        aesGcmEncrypt({ key: "not-a-hex-string!!", plaintext: "test" }),
      ).to.throw(/Invalid hex/);
    });
  });

  describe("short ciphertext", () => {
    it("should reject ciphertext shorter than nonce + tag", () => {
      // base64 of a very short byte string
      expect(() =>
        aesGcmDecrypt({ key: key256, ciphertext: "YQ==" }),
      ).to.throw(/too short/);
    });
  });
});

describe("AES-GCM-SIV", () => {
  const key256 = "a".repeat(64);
  const key128 = "b".repeat(32);

  describe("aesGcmSivEncrypt + aesGcmSivDecrypt roundtrip", () => {
    it("should encrypt and decrypt with a 256-bit key", () => {
      const result = aesGcmSivEncrypt({ key: key256, plaintext: "Hello, SIV!" });
      expect(result.algorithm).to.equal("aes-256-gcm-siv");
      expect(result.ciphertext).to.be.a("string");

      const decrypted = aesGcmSivDecrypt({
        key: key256,
        ciphertext: result.ciphertext,
      });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("Hello, SIV!");
    });

    it("should encrypt and decrypt with a 128-bit key", () => {
      const result = aesGcmSivEncrypt({ key: key128, plaintext: "Hello, 128-SIV!" });
      expect(result.algorithm).to.equal("aes-128-gcm-siv");

      const decrypted = aesGcmSivDecrypt({
        key: key128,
        ciphertext: result.ciphertext,
      });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("Hello, 128-SIV!");
    });

    it("should handle empty plaintext", () => {
      const result = aesGcmSivEncrypt({ key: key256, plaintext: "" });
      const decrypted = aesGcmSivDecrypt({
        key: key256,
        ciphertext: result.ciphertext,
      });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("");
    });

    it("should handle Uint8Array plaintext", () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const result = aesGcmSivEncrypt({ key: key256, plaintext });
      const decrypted = aesGcmSivDecrypt({
        key: key256,
        ciphertext: result.ciphertext,
      });
      expect(Buffer.from(decrypted)).to.deep.equal(Buffer.from(plaintext));
    });

    it("should handle Uint8Array key", () => {
      const keyBytes = new Uint8Array(32).fill(0xaa);
      const result = aesGcmSivEncrypt({ key: keyBytes, plaintext: "bytes key" });
      expect(result.algorithm).to.equal("aes-256-gcm-siv");
      const decrypted = aesGcmSivDecrypt({
        key: keyBytes,
        ciphertext: result.ciphertext,
      });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("bytes key");
    });
  });

  describe("AAD support", () => {
    it("should encrypt and decrypt with AAD", () => {
      const aad = Buffer.from("additional-context");
      const result = aesGcmSivEncrypt({
        key: key256,
        plaintext: "with aad",
        aad,
      });
      const decrypted = aesGcmSivDecrypt({
        key: key256,
        ciphertext: result.ciphertext,
        aad,
      });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("with aad");
    });

    it("should fail decryption with wrong AAD", () => {
      const aad = Buffer.from("correct");
      const result = aesGcmSivEncrypt({
        key: key256,
        plaintext: "with aad",
        aad,
      });
      expect(() =>
        aesGcmSivDecrypt({
          key: key256,
          ciphertext: result.ciphertext,
          aad: Buffer.from("wrong"),
        }),
      ).to.throw();
    });
  });

  describe("wrong key rejection", () => {
    it("should fail decryption with wrong key", () => {
      const result = aesGcmSivEncrypt({ key: key256, plaintext: "secret" });
      expect(() =>
        aesGcmSivDecrypt({ key: "c".repeat(64), ciphertext: result.ciphertext }),
      ).to.throw();
    });
  });

  describe("invalid key length", () => {
    it("should reject 192-bit key (24 bytes)", () => {
      expect(() =>
        aesGcmSivEncrypt({ key: "a".repeat(48), plaintext: "test" }),
      ).to.throw(/16 bytes.*32 bytes/);
    });

    it("should reject invalid key length on decrypt", () => {
      const result = aesGcmSivEncrypt({ key: key256, plaintext: "test" });
      expect(() =>
        aesGcmSivDecrypt({ key: "a".repeat(48), ciphertext: result.ciphertext }),
      ).to.throw(/16 bytes.*32 bytes/);
    });
  });

  describe("short ciphertext", () => {
    it("should reject ciphertext shorter than nonce + tag", () => {
      expect(() =>
        aesGcmSivDecrypt({ key: key256, ciphertext: "YQ==" }),
      ).to.throw(/too short/);
    });
  });
});
