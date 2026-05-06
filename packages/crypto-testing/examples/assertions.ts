// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Example: Assertion helpers in tests.
 *
 * Assertion helpers provide one-liner validations for common crypto
 * patterns. They throw descriptive errors when something is wrong,
 * making test failures easy to diagnose.
 */

import {
  expectValidHex,
  expectValidBase64,
  expectKeyPair,
  expectEncryptDecryptRoundTrip,
  expectSignVerifyRoundTrip,
  TEST_KEYS,
} from "@sebastienrousseau/crypto-testing";

// --- Validate hex strings ---
expectValidHex("deadbeef");              // OK
expectValidHex("abcdef0123456789", 8);   // OK: 16 hex chars = 8 bytes

try {
  expectValidHex("not-hex!");
} catch (e) {
  console.log("Caught:", (e as Error).message);
  // => "String is not valid hexadecimal: ..."
}

try {
  expectValidHex("aabb", 4);
} catch (e) {
  console.log("Caught:", (e as Error).message);
  // => "Expected 4 bytes (8 hex chars), got 2 bytes (4 hex chars)"
}

// --- Validate Base64 strings ---
expectValidBase64(Buffer.from("hello").toString("base64")); // OK

try {
  expectValidBase64("not valid base64!!!");
} catch (e) {
  console.log("Caught:", (e as Error).message);
}

// --- Validate key pairs ---
expectKeyPair(TEST_KEYS.ed25519); // OK: has publicKey + privateKey
expectKeyPair(TEST_KEYS.x25519);  // OK

try {
  expectKeyPair({ publicKey: "aabb", privateKey: "aabb" });
} catch (e) {
  console.log("Caught:", (e as Error).message);
  // => "Public key and private key must not be identical"
}

// --- Encrypt/decrypt round-trip (uses real crypto-lib) ---
const key = TEST_KEYS.aes256;
expectEncryptDecryptRoundTrip(key, "Hello, world!");
console.log("Encrypt/decrypt round-trip passed");

// --- Sign/verify round-trip (uses real crypto-lib) ---
expectSignVerifyRoundTrip("ed25519");
console.log("Ed25519 sign/verify round-trip passed");

expectSignVerifyRoundTrip("ecdsa-p256");
console.log("ECDSA P-256 sign/verify round-trip passed");

// Also works with post-quantum algorithms:
// expectSignVerifyRoundTrip("ml-dsa-65");
// console.log("ML-DSA-65 sign/verify round-trip passed");
