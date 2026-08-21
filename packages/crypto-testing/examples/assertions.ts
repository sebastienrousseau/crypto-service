// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Assertion helpers in tests.
 *
 * Assertion helpers provide one-liner validations for common crypto
 * patterns. They throw descriptive errors when something is wrong,
 * making test failures easy to diagnose.
 *
 * Run: `npx ts-node examples/assertions.ts`
 */

import {
  expectValidHex,
  expectValidBase64,
  expectKeyPair,
  expectEncryptDecryptRoundTrip,
  expectSignVerifyRoundTrip,
  TEST_KEYS,
} from "@sebastienrousseau/crypto-testing";
import { header, task, summary } from "./support";

async function main() {
  header("crypto-testing -- assertion helpers");

  await task("Validate hex string", () => {
    expectValidHex("deadbeef");
  });

  await task("Validate hex string with byte length", () => {
    expectValidHex("abcdef0123456789", 8);
  });

  await task("Reject invalid hex string", () => {
    let caught = false;
    try {
      expectValidHex("not-hex!");
    } catch {
      caught = true;
    }
    if (!caught) throw new Error("Should have thrown");
  });

  await task("Reject wrong hex byte length", () => {
    let caught = false;
    try {
      expectValidHex("aabb", 4);
    } catch {
      caught = true;
    }
    if (!caught) throw new Error("Should have thrown");
  });

  await task("Validate Base64 string", () => {
    expectValidBase64(Buffer.from("hello").toString("base64"));
  });

  await task("Validate Ed25519 key pair", () => {
    expectKeyPair(TEST_KEYS.ed25519);
  });

  await task("Validate X25519 key pair", () => {
    expectKeyPair(TEST_KEYS.x25519);
  });

  await task("Reject identical pub/priv keys", () => {
    let caught = false;
    try {
      expectKeyPair({ publicKey: "aabb", privateKey: "aabb" });
    } catch {
      caught = true;
    }
    if (!caught) throw new Error("Should have thrown");
  });

  await task("Encrypt/decrypt round-trip (real crypto-lib)", () => {
    expectEncryptDecryptRoundTrip(TEST_KEYS.aes256, "Hello, world!");
  });

  await task("Ed25519 sign/verify round-trip (real crypto-lib)", () => {
    expectSignVerifyRoundTrip("ed25519");
  });

  await task("ECDSA P-256 sign/verify round-trip (real crypto-lib)", () => {
    expectSignVerifyRoundTrip("ecdsa-p256");
  });

  summary(11);
}

main();
