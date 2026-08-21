import { expect } from "chai";
import {
  isWebCryptoAvailable,
  webCryptoAesGcmEncrypt,
  webCryptoAesGcmDecrypt,
  webCryptoHash,
} from "../../src/accel/webcrypto-bridge";

describe("WebCrypto Bridge", () => {
  describe("isWebCryptoAvailable", () => {
    it("should return true in Node.js >= 22", () => {
      const available = isWebCryptoAvailable();
      expect(available).to.be.true;
    });
  });

  describe("webCryptoHash", () => {
    it("should hash with SHA-256", async () => {
      const result = await webCryptoHash({
        algorithm: "SHA-256",
        data: "hello world",
      });
      expect(result.digest).to.be.a("string");
      expect(result.digest).to.have.length(64); // 32 bytes = 64 hex
      expect(result.accelerated).to.be.a("boolean");
    });

    it("should hash with SHA-384", async () => {
      const result = await webCryptoHash({
        algorithm: "SHA-384",
        data: "hello world",
      });
      expect(result.digest).to.have.length(96); // 48 bytes
    });

    it("should hash with SHA-512", async () => {
      const result = await webCryptoHash({
        algorithm: "SHA-512",
        data: "hello world",
      });
      expect(result.digest).to.have.length(128); // 64 bytes
    });

    it("should accept Uint8Array input", async () => {
      const data = new Uint8Array([104, 101, 108, 108, 111]);
      const result = await webCryptoHash({ algorithm: "SHA-256", data });
      expect(result.digest).to.be.a("string");
    });

    it("should produce consistent results", async () => {
      const r1 = await webCryptoHash({ algorithm: "SHA-256", data: "test" });
      const r2 = await webCryptoHash({ algorithm: "SHA-256", data: "test" });
      expect(r1.digest).to.equal(r2.digest);
    });
  });

  describe("webCryptoAesGcmEncrypt / Decrypt", () => {
    it("should encrypt and decrypt round-trip", async () => {
      const key = "a".repeat(64); // 32 bytes
      const plaintext = "hello world";

      const encrypted = await webCryptoAesGcmEncrypt({ key, plaintext });
      expect(encrypted.ciphertext).to.be.a("string");
      expect(encrypted.accelerated).to.be.a("boolean");

      const decrypted = await webCryptoAesGcmDecrypt({
        key,
        ciphertext: encrypted.ciphertext,
      });
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal("hello world");
    });

    it("should support AAD", async () => {
      const key = "b".repeat(64);
      const plaintext = "secret data";
      const aad = Buffer.from("authenticated-context");

      const encrypted = await webCryptoAesGcmEncrypt({ key, plaintext, aad });
      const decrypted = await webCryptoAesGcmDecrypt({
        key,
        ciphertext: encrypted.ciphertext,
        aad,
      });
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal("secret data");
    });

    it("should work with 128-bit keys", async () => {
      const key = "c".repeat(32); // 16 bytes = 128 bit
      const plaintext = "test 128-bit";
      const encrypted = await webCryptoAesGcmEncrypt({ key, plaintext });
      const decrypted = await webCryptoAesGcmDecrypt({
        key,
        ciphertext: encrypted.ciphertext,
      });
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal("test 128-bit");
    });

    it("should fail decryption with wrong key", async () => {
      const key = "d".repeat(64);
      const wrongKey = "e".repeat(64);
      const encrypted = await webCryptoAesGcmEncrypt({ key, plaintext: "test" });

      try {
        await webCryptoAesGcmDecrypt({
          key: wrongKey,
          ciphertext: encrypted.ciphertext,
        });
        expect.fail("Should have thrown");
      } catch (err) {
        // Expected: decryption fails with wrong key
        expect(err).to.exist;
      }
    });

    it("should reject invalid key length", async () => {
      try {
        await webCryptoAesGcmEncrypt({ key: "ab", plaintext: "test" });
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key must be");
      }
    });
  });
});
