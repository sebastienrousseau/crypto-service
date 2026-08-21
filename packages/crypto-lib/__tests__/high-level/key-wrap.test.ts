import { expect } from "chai";
import {
  aesKwWrap,
  aesKwUnwrap,
  aesKwpWrap,
  aesKwpUnwrap,
  x25519AesKwWrap,
  x25519AesKwUnwrap,
} from "../../src/high-level/key-wrap";
import { generateX25519KeyPair } from "../../src/modern/ecdh";

describe("Key Wrapping", () => {
  // 256-bit KEK (32 bytes = 64 hex chars)
  const kek256 = "a".repeat(64);
  // 128-bit KEK (16 bytes = 32 hex chars)
  const kek128 = "b".repeat(32);
  // 256-bit key to wrap (32 bytes = 64 hex chars)
  const keyToWrap = "c".repeat(64);

  describe("AES-KW (RFC 3394)", () => {
    it("should wrap and unwrap a 256-bit key with 256-bit KEK", () => {
      const wrapped = aesKwWrap(kek256, keyToWrap);
      expect(wrapped.algorithm).to.equal("aes-kw");
      expect(wrapped.wrapped).to.be.a("string");

      const unwrapped = aesKwUnwrap(kek256, wrapped.wrapped);
      expect(Buffer.from(unwrapped).toString("hex")).to.equal(keyToWrap);
    });

    it("should wrap and unwrap a 128-bit key with 128-bit KEK", () => {
      const wrapped = aesKwWrap(kek128, kek128);
      const unwrapped = aesKwUnwrap(kek128, wrapped.wrapped);
      expect(Buffer.from(unwrapped).toString("hex")).to.equal(kek128);
    });

    it("should wrap and unwrap with Uint8Array inputs", () => {
      const kekBytes = new Uint8Array(32).fill(0xaa);
      const keyBytes = new Uint8Array(32).fill(0xbb);
      const wrapped = aesKwWrap(kekBytes, keyBytes);
      const unwrapped = aesKwUnwrap(kekBytes, wrapped.wrapped);
      expect(Buffer.from(unwrapped)).to.deep.equal(Buffer.from(keyBytes));
    });

    it("should fail unwrap with wrong KEK", () => {
      const wrapped = aesKwWrap(kek256, keyToWrap);
      expect(() => aesKwUnwrap("d".repeat(64), wrapped.wrapped)).to.throw();
    });
  });

  describe("AES-KWP (RFC 5649)", () => {
    it("should wrap and unwrap arbitrary-length data", () => {
      const data = "aa".repeat(7); // 7 bytes (not multiple of 8)
      const wrapped = aesKwpWrap(kek256, data);
      expect(wrapped.algorithm).to.equal("aes-kwp");

      const unwrapped = aesKwpUnwrap(kek256, wrapped.wrapped);
      expect(Buffer.from(unwrapped).toString("hex")).to.equal(data);
    });

    it("should wrap and unwrap a single byte", () => {
      const data = new Uint8Array([0x42]);
      const wrapped = aesKwpWrap(kek256, data);
      const unwrapped = aesKwpUnwrap(kek256, wrapped.wrapped);
      expect(Buffer.from(unwrapped)).to.deep.equal(Buffer.from(data));
    });

    it("should fail unwrap with wrong KEK", () => {
      const wrapped = aesKwpWrap(kek256, keyToWrap);
      expect(() => aesKwpUnwrap("d".repeat(64), wrapped.wrapped)).to.throw();
    });
  });

  describe("X25519 + AES-KW", () => {
    it("should wrap and unwrap using public-key ECDH", () => {
      const kp = generateX25519KeyPair();
      const wrapped = x25519AesKwWrap(kp.publicKey, keyToWrap);
      expect(wrapped.algorithm).to.equal("x25519-aes-kw");
      expect(wrapped.ephemeralPublicKey).to.be.a("string");
      expect(wrapped.ephemeralPublicKey).to.have.length(64);

      const unwrapped = x25519AesKwUnwrap(
        kp.privateKey,
        wrapped.ephemeralPublicKey,
        wrapped.wrapped,
      );
      expect(Buffer.from(unwrapped).toString("hex")).to.equal(keyToWrap);
    });

    it("should produce different wraps (ephemeral keys)", () => {
      const kp = generateX25519KeyPair();
      const w1 = x25519AesKwWrap(kp.publicKey, keyToWrap);
      const w2 = x25519AesKwWrap(kp.publicKey, keyToWrap);
      expect(w1.ephemeralPublicKey).to.not.equal(w2.ephemeralPublicKey);
    });

    it("should fail unwrap with wrong recipient key", () => {
      const alice = generateX25519KeyPair();
      const bob = generateX25519KeyPair();
      const wrapped = x25519AesKwWrap(alice.publicKey, keyToWrap);
      expect(() =>
        x25519AesKwUnwrap(
          bob.privateKey,
          wrapped.ephemeralPublicKey,
          wrapped.wrapped,
        ),
      ).to.throw();
    });

    it("should accept Uint8Array inputs", () => {
      const kp = generateX25519KeyPair();
      const pubBytes = Buffer.from(kp.publicKey, "hex");
      const privBytes = Buffer.from(kp.privateKey, "hex");
      const keyBytes = new Uint8Array(32).fill(0xcc);

      const wrapped = x25519AesKwWrap(pubBytes, keyBytes);
      const ephBytes = Buffer.from(wrapped.ephemeralPublicKey, "hex");
      const unwrapped = x25519AesKwUnwrap(
        privBytes,
        ephBytes,
        wrapped.wrapped,
      );
      expect(Buffer.from(unwrapped)).to.deep.equal(Buffer.from(keyBytes));
    });
  });
});
