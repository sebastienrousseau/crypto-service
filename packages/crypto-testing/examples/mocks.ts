// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Mocking crypto operations for speed.
 *
 * Mock functions replace expensive crypto operations (Argon2, real
 * key generation, authenticated encryption) with instant XOR-based
 * fakes. Perfect for unit tests that need to exercise business logic
 * without waiting for real cryptography.
 *
 * Run: `npx ts-node examples/mocks.ts`
 */

import {
  mockHashPassword,
  mockGenerateKeyPair,
  mockEncrypt,
  mockDecrypt,
  mockSign,
  mockVerify,
} from "@sebastienrousseau/crypto-testing";
import { header, task, summary } from "./support";

async function main() {
  header("crypto-testing -- mock operations");

  await task("Mock password hashing (instant, no Argon2)", () => {
    const result = mockHashPassword("my-secret-password");
    if (result.algorithm !== "mock-argon2id") throw new Error("Wrong algorithm");
    if (!result.phc.startsWith("$mock-argon2id$")) throw new Error("Bad PHC");
  });

  await task("Mock key pair generation (Ed25519)", () => {
    const kp = mockGenerateKeyPair("ed25519");
    if (!kp.publicKey || !kp.privateKey) throw new Error("Missing keys");
    if (!kp.kid) throw new Error("Missing kid");
  });

  await task("Mock key pair generation (unknown algorithm)", () => {
    const kp = mockGenerateKeyPair("my-custom-alg");
    if (kp.publicKey !== "aa".repeat(32)) throw new Error("Unexpected key");
  });

  await task("Mock encrypt/decrypt round-trip", () => {
    const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const ciphertext = mockEncrypt(key, "hello world");
    const decrypted = Buffer.from(mockDecrypt(key, ciphertext)).toString("utf8");
    if (decrypted !== "hello world") throw new Error("Round-trip failed");
  });

  await task("Mock sign/verify (valid signature)", () => {
    const kp = mockGenerateKeyPair("ed25519");
    const sig = mockSign(kp.privateKey, "important message");
    const valid = mockVerify(kp.publicKey, "important message", sig, kp.privateKey);
    if (!valid) throw new Error("Signature should be valid");
  });

  await task("Mock sign/verify (tampered message)", () => {
    const kp = mockGenerateKeyPair("ed25519");
    const sig = mockSign(kp.privateKey, "important message");
    const valid = mockVerify(kp.publicKey, "tampered message", sig, kp.privateKey);
    if (valid) throw new Error("Tampered signature should be invalid");
  });

  summary(6);
}

main();
