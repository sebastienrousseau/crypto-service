// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Example: Mocking crypto operations for speed.
 *
 * Mock functions replace expensive crypto operations (Argon2, real
 * key generation, authenticated encryption) with instant XOR-based
 * fakes. Perfect for unit tests that need to exercise business logic
 * without waiting for real cryptography.
 */

import {
  mockHashPassword,
  mockGenerateKeyPair,
  mockEncrypt,
  mockDecrypt,
  mockSign,
  mockVerify,
} from "@sebastienrousseau/crypto-testing";

// --- Mock password hashing (instant, no Argon2) ---
const pwResult = mockHashPassword("my-secret-password");
console.log("Mock hash:", pwResult.hash);
console.log("Mock PHC :", pwResult.phc);
// pwResult.algorithm === "mock-argon2id"

// --- Mock key pair generation (deterministic) ---
const kp = mockGenerateKeyPair("ed25519");
console.log("Public :", kp.publicKey);
console.log("Private:", kp.privateKey);
console.log("KID    :", kp.kid);

// Any unknown algorithm returns synthetic 32-byte keys
const custom = mockGenerateKeyPair("my-custom-alg");
console.log("Custom public:", custom.publicKey); // "aa" x 32

// --- Mock encrypt / decrypt round-trip ---
const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const ciphertext = mockEncrypt(key, "hello world");
const decrypted = mockDecrypt(key, ciphertext);
console.log("Decrypted:", Buffer.from(decrypted).toString("utf8"));
// => "hello world"

// --- Mock sign / verify ---
const sig = mockSign(kp.privateKey, "important message");
const valid = mockVerify(kp.publicKey, "important message", sig, kp.privateKey);
console.log("Signature valid:", valid); // true

const tampered = mockVerify(kp.publicKey, "tampered message", sig, kp.privateKey);
console.log("Tampered valid:", tampered); // false
