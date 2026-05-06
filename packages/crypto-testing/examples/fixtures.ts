// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Example: Using pre-built test fixtures.
 *
 * Fixture generators create complete, ready-to-use test data in one
 * call. They combine deterministic keys, mock operations, and known
 * test vectors so you can focus on testing your own code.
 */

import {
  createTestKeyring,
  createTestEncryptedMessage,
  createTestSignedMessage,
  createTestPasswordHash,
} from "@sebastienrousseau/crypto-testing";

// --- Full keyring with signing, exchange, and symmetric keys ---
const keyring = createTestKeyring();
console.log("Signing key (Ed25519):", keyring.signing.publicKey);
console.log("Exchange key (X25519):", keyring.exchange.publicKey);
console.log("ECDSA key (P-256)    :", keyring.ecdsa.publicKey);
console.log("Symmetric key (AES)  :", keyring.symmetric);
console.log("HMAC key             :", keyring.hmac);

// --- Pre-encrypted message ---
const encrypted = createTestEncryptedMessage();
console.log("Plaintext :", encrypted.plaintext);
console.log("Ciphertext:", encrypted.ciphertext);
console.log("Key       :", encrypted.key);
// Use mockDecrypt(encrypted.key, encrypted.ciphertext) to recover plaintext

// Custom plaintext
const custom = createTestEncryptedMessage("my secret data");
console.log("Custom ciphertext:", custom.ciphertext);

// --- Pre-signed message ---
const signed = createTestSignedMessage();
console.log("Message  :", signed.message);
console.log("Signature:", signed.signature);
console.log("Algorithm:", signed.algorithm);
// Use mockVerify(signed.publicKey, signed.message, signed.signature, signed.privateKey)

// With a specific algorithm
const ecdsaSigned = createTestSignedMessage("p256");
console.log("ECDSA signature:", ecdsaSigned.signature);

// --- Pre-hashed password ---
const pwHash = createTestPasswordHash();
console.log("Hash :", pwHash.hash);
console.log("Salt :", pwHash.salt);
console.log("PHC  :", pwHash.phc);

// With a custom password
const customPw = createTestPasswordHash("hunter2");
console.log("Custom PHC:", customPw.phc);
