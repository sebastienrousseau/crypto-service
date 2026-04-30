/**
 * Tests specifically targeting uncovered branches in modern crypto modules.
 *
 * Coverage targets:
 *   - aead.ts:91-92   — aeadDecrypt invalid key length (Uint8Array path)
 *   - kdf.ts:104       — unsupported KDF algorithm
 *   - signing.ts:63-65 — ed25519Sign with Uint8Array inputs
 *   - signing.ts:84-88 — ed25519Verify with Uint8Array inputs
 *   - ecdh.ts:58-62    — x25519Exchange with Uint8Array inputs
 *   - hash.ts:47       — hash with Uint8Array input
 */
import { expect } from "chai";
import {
  aeadEncrypt,
  aeadDecrypt,
  hash,
  kdfDerive,
  ed25519Sign,
  ed25519Verify,
  generateEd25519KeyPair,
  generateX25519KeyPair,
  x25519Exchange,
} from "../../src/modern";

describe("Modern Crypto – Branch Coverage", () => {
  // -----------------------------------------------------------------
  // aead.ts — aeadDecrypt with invalid Uint8Array key length (lines 91-92)
  // -----------------------------------------------------------------
  describe("AEAD decrypt – Uint8Array key validation", () => {
    it("should reject Uint8Array key that is not 32 bytes", () => {
      const shortKey = new Uint8Array(16); // 16 bytes, not 32
      expect(() =>
        aeadDecrypt({ key: shortKey, ciphertext: "AAAA".repeat(20) }),
      ).to.throw(/32 bytes/);
    });

    it("should accept valid 32-byte Uint8Array key for encrypt", () => {
      const key = new Uint8Array(32).fill(0xaa);
      const result = aeadEncrypt({ key, plaintext: "test" });
      expect(result.algorithm).to.equal("xchacha20-poly1305");
      // And roundtrip with same Uint8Array key
      const decrypted = aeadDecrypt({ key, ciphertext: result.ciphertext });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("test");
    });

    it("should encrypt with Uint8Array plaintext input", () => {
      const key = "aa".repeat(32);
      const plaintext = Buffer.from("binary data", "utf8");
      const result = aeadEncrypt({ key, plaintext });
      const decrypted = aeadDecrypt({ key, ciphertext: result.ciphertext });
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("binary data");
    });
  });

  // -----------------------------------------------------------------
  // hash.ts — toBytes with Uint8Array input (line 47)
  // -----------------------------------------------------------------
  describe("Hash – Uint8Array input branch", () => {
    it("should hash a Uint8Array directly", () => {
      const data = Buffer.from("hello", "utf8");
      const r1 = hash({ algorithm: "sha256", data });
      const r2 = hash({ algorithm: "sha256", data: "hello" });
      expect(r1.digest).to.equal(r2.digest);
    });
  });

  // -----------------------------------------------------------------
  // kdf.ts — unsupported algorithm default case (line 104)
  // -----------------------------------------------------------------
  describe("KDF – unsupported algorithm", () => {
    it("should throw for unsupported KDF algorithm", () => {
      expect(() =>
        kdfDerive({ algorithm: "argon2" as any, password: "test" }),
      ).to.throw(/Unsupported KDF algorithm/);
    });
  });

  // -----------------------------------------------------------------
  // signing.ts — Uint8Array input branches (lines 63-65, 84-88)
  // -----------------------------------------------------------------
  describe("Ed25519 – Uint8Array input branches", () => {
    it("should sign with Uint8Array privateKey and message", () => {
      const kp = generateEd25519KeyPair();
      const privBytes = Buffer.from(kp.privateKey, "hex");
      const msgBytes = Buffer.from("Hello Uint8Array", "utf8");

      const sig = ed25519Sign(privBytes, msgBytes);
      expect(sig.algorithm).to.equal("ed25519");
      expect(sig.signature).to.have.length(128);

      // Verify with string inputs to confirm cross-type compatibility
      const result = ed25519Verify(kp.publicKey, "Hello Uint8Array", sig.signature);
      expect(result.valid).to.be.true;
    });

    it("should verify with Uint8Array publicKey, message, and signature", () => {
      const kp = generateEd25519KeyPair();
      const sig = ed25519Sign(kp.privateKey, "verify-bytes");

      const pubBytes = Buffer.from(kp.publicKey, "hex");
      const msgBytes = Buffer.from("verify-bytes", "utf8");
      const sigBytes = Buffer.from(sig.signature, "hex");

      const result = ed25519Verify(pubBytes, msgBytes, sigBytes);
      expect(result.valid).to.be.true;
      expect(result.algorithm).to.equal("ed25519");
    });
  });

  // -----------------------------------------------------------------
  // ecdh.ts — Uint8Array input branches (lines 58-62)
  // -----------------------------------------------------------------
  describe("X25519 – Uint8Array input branches", () => {
    it("should perform key exchange with Uint8Array keys", () => {
      const alice = generateX25519KeyPair();
      const bob = generateX25519KeyPair();

      const alicePrivBytes = Buffer.from(alice.privateKey, "hex");
      const bobPubBytes = Buffer.from(bob.publicKey, "hex");

      const shared1 = x25519Exchange(alicePrivBytes, bobPubBytes);

      const bobPrivBytes = Buffer.from(bob.privateKey, "hex");
      const alicePubBytes = Buffer.from(alice.publicKey, "hex");

      const shared2 = x25519Exchange(bobPrivBytes, alicePubBytes);

      expect(shared1.sharedSecret).to.equal(shared2.sharedSecret);
      expect(shared1.algorithm).to.equal("x25519");
    });

    it("should handle mixed string and Uint8Array inputs", () => {
      const alice = generateX25519KeyPair();
      const bob = generateX25519KeyPair();

      // String private + Uint8Array public
      const shared1 = x25519Exchange(
        alice.privateKey,
        Buffer.from(bob.publicKey, "hex"),
      );

      // Uint8Array private + string public
      const shared2 = x25519Exchange(
        Buffer.from(bob.privateKey, "hex"),
        alice.publicKey,
      );

      expect(shared1.sharedSecret).to.equal(shared2.sharedSecret);
    });
  });

  // -----------------------------------------------------------------
  // Security: hex validation in toBytes
  // -----------------------------------------------------------------
  describe("Hex input validation", () => {
    it("should reject invalid hex key for AEAD encrypt", () => {
      expect(() => aeadEncrypt({ key: "ZZZZ".repeat(16), plaintext: "test" })).to.throw(
        /Invalid hex string/,
      );
    });

    it("should reject invalid hex key for AEAD decrypt", () => {
      expect(() => aeadDecrypt({ key: "not-hex!", ciphertext: "AAAA".repeat(20) })).to.throw(
        /Invalid hex string/,
      );
    });

    it("should reject invalid hex salt for KDF", () => {
      expect(() =>
        kdfDerive({ algorithm: "hkdf-sha256", password: "test", salt: "gg".repeat(16) }),
      ).to.throw(/Invalid hex string/);
    });
  });
});
