// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Example: Using deterministic test keys.
 *
 * Deterministic keys let you write tests with predictable values
 * instead of generating random keys on every run. This makes test
 * output reproducible and failures easy to debug.
 */

import { TEST_KEYS, TEST_VECTORS } from "@sebastienrousseau/crypto-testing";

// Access pre-generated Ed25519 key pair
console.log("Ed25519 public key :", TEST_KEYS.ed25519.publicKey);
console.log("Ed25519 private key:", TEST_KEYS.ed25519.privateKey);

// Access pre-generated X25519 key pair for key exchange
console.log("X25519 public key  :", TEST_KEYS.x25519.publicKey);

// Use the symmetric AES-256 key for encryption tests
console.log("AES-256 key        :", TEST_KEYS.aes256);

// Verify known hash test vectors
console.log("SHA-256 of test plaintext:", TEST_VECTORS.sha256);
console.log("SHA3-256 of test plaintext:", TEST_VECTORS.sha3_256);
console.log("BLAKE3 of test plaintext:", TEST_VECTORS.blake3);

// Use in a test assertion (pseudo-code)
// import { crypto } from "@sebastienrousseau/crypto-lib";
// const digest = crypto.hash("sha256", TEST_VECTORS.plaintext);
// assert.strictEqual(digest, TEST_VECTORS.sha256);
