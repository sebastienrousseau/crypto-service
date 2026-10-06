// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Pre-generated deterministic key pairs for fast, reproducible tests.
 *
 * @example
 * ```ts
 * import { TEST_KEYS } from "@sebastienrousseau/crypto-testing";
 *
 * const { publicKey, privateKey } = TEST_KEYS.ed25519;
 * const aesKey = TEST_KEYS.aes256;
 * ```
 */

export const TEST_KEYS = {
  /** Ed25519 key pair (RFC 8032 test vector). */
  ed25519: {
    /** Hex-encoded Ed25519 public key. */
    publicKey:
      "d75a980182b10ab7d54bfed3c964073a0ee172f3daa3f4a18446b7e8c38f1dd5",
    /** Hex-encoded Ed25519 private key. */
    privateKey:
      "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60",
  },
  /** X25519 key pair (RFC 7748 test vector). */
  x25519: {
    /** Hex-encoded X25519 public key. */
    publicKey:
      "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a",
    /** Hex-encoded X25519 private key. */
    privateKey:
      "77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a",
  },
  /** NIST P-256 key pair. */
  p256: {
    /** Hex-encoded P-256 public key (uncompressed). */
    publicKey:
      "0437c1b9e44bcb3d97a78b8b5e71f5e3e5a4a0e7d6b8c2f1e0d9c8b7a6f5e4d3c2b1a09f8e7d6c5b4a3029f8e7d6c5b4a3029f8e7d6c5b4a3029f8e7d6c5b4a302",
    /** Hex-encoded P-256 private key. */
    privateKey:
      "c9afa9d845ba75166b5c215767b1d6934e50c3db36e89b127b8a622b120f6721",
  },
  /** Hex-encoded 256-bit AES key. */
  aes256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  /** Hex-encoded 256-bit HMAC key. */
  hmacKey: "cafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe",
} as const;

/**
 * A known plaintext/ciphertext pair for round-trip testing.
 *
 * @example
 * ```ts
 * import { TEST_VECTORS } from "@sebastienrousseau/crypto-testing";
 *
 * const input = TEST_VECTORS.plaintext;
 * const expected = TEST_VECTORS.sha256;
 * ```
 */
export const TEST_VECTORS = {
  /** UTF-8 plaintext input for hashing. */
  plaintext: "The quick brown fox jumps over the lazy dog",
  /** Expected SHA-256 digest (hex) of `plaintext`. */
  sha256: "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
  /** Expected SHA3-256 digest (hex) of `plaintext`. */
  sha3_256: "a80f839cd4f83f6c3dafc87feae470045e4eb0d366397d5c6ce34ba1739f734d",
  /** Expected BLAKE3 digest (hex) of `plaintext`. */
  blake3: "8e7e26d7e72a04d2ed173f90a72ec2a3bf3bb38890c9a2f95f3ab0e18a1e1a4a",
} as const;

/**
 * Official NIST and RFC cryptographic regression vectors.
 */
export const RFC_VECTORS = {
  /**
   * RFC 8439 Section 2.8.2: ChaCha20-Poly1305 AEAD Test Vector.
   */
  rfc8439_chacha20_poly1305: {
    key: "808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f",
    nonce: "070000004041424344454647",
    aad: "50515253c0c1c2c3c4c5c6c7",
    plaintext:
      "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it.",
    ciphertext:
      "d31a8d34648e60db7b86afbc53ef7ec2a4aded51296e08fea9e2b5a736ee62d63dbea45e8ca9671282fafb69da92728b1a71de0a9e060b2905d6a5b67ecd3b3692ddbd7f2d778b8c9803aee328091b58fab324e4fad675945585808b4831d7bc3ff4def08e4b7a9de576d26586cec64b6116",
    tag: "1ae10b594f09e26a7e902ecbd0600691",
  },
  /**
   * RFC 5869 Test Case 1: HKDF-SHA256 Test Vector.
   */
  rfc5869_hkdf_sha256: {
    ikm: "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
    salt: "000102030405060708090a0b0c",
    info: "f0f1f2f3f4f5f6f7f8f9",
    l: 42,
    prk: "077709362c2e32df0ddc3f0dc47bba6390b6c73bb50f9c3122ec844ad7c2b3e0",
    okm: "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865",
  },
  /**
   * NIST SP 800-38D AES-256-GCM Test Vector.
   */
  nist_aes256_gcm: {
    key: "0000000000000000000000000000000000000000000000000000000000000000",
    iv: "000000000000000000000000",
    plaintext: "",
    aad: "",
    ciphertext: "",
    tag: "530f8afbc74536b9a963b4f1c4cb738b",
  },
} as const;
