// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/** Pre-generated deterministic key pairs for fast, reproducible tests. */

export const TEST_KEYS = {
  ed25519: {
    publicKey:
      "d75a980182b10ab7d54bfed3c964073a0ee172f3daa3f4a18446b7e8c38f1dd5",
    privateKey:
      "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60",
  },
  x25519: {
    publicKey:
      "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a",
    privateKey:
      "77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a",
  },
  p256: {
    publicKey:
      "0437c1b9e44bcb3d97a78b8b5e71f5e3e5a4a0e7d6b8c2f1e0d9c8b7a6f5e4d3c2b1a09f8e7d6c5b4a3029f8e7d6c5b4a3029f8e7d6c5b4a3029f8e7d6c5b4a302",
    privateKey:
      "c9afa9d845ba75166b5c215767b1d6934e50c3db36e89b127b8a622b120f6721",
  },
  aes256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  hmacKey: "cafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe",
} as const;

/** A known plaintext/ciphertext pair for round-trip testing. */
export const TEST_VECTORS = {
  plaintext: "The quick brown fox jumps over the lazy dog",
  sha256: "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
  sha3_256: "a80f839cd4f83f6c3dafc87feae470045e4eb0d366397d5c6ce34ba1739f734d",
  blake3: "8e7e26d7e72a04d2ed173f90a72ec2a3bf3bb38890c9a2f95f3ab0e18a1e1a4a",
} as const;
