// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Using deterministic test keys.
 *
 * Deterministic keys let you write tests with predictable values
 * instead of generating random keys on every run. This makes test
 * output reproducible and failures easy to debug.
 *
 * Run: `npx ts-node examples/keys.ts`
 */

import { TEST_KEYS, TEST_VECTORS } from "@sebastienrousseau/crypto-testing";
import { header, task, summary } from "./support";

async function main() {
  header("crypto-testing -- deterministic keys");

  await task("Access Ed25519 key pair", () => {
    const { publicKey, privateKey } = TEST_KEYS.ed25519;
    if (!publicKey || !privateKey) throw new Error("Missing Ed25519 keys");
  });

  await task("Access X25519 key-exchange pair", () => {
    const { publicKey } = TEST_KEYS.x25519;
    if (!publicKey) throw new Error("Missing X25519 public key");
  });

  await task("Access P-256 ECDSA key pair", () => {
    const { publicKey, privateKey } = TEST_KEYS.p256;
    if (!publicKey || !privateKey) throw new Error("Missing P-256 keys");
  });

  await task("Access AES-256 symmetric key", () => {
    const key = TEST_KEYS.aes256;
    if (key.length !== 64) throw new Error("AES-256 key must be 64 hex chars");
  });

  await task("Access HMAC key", () => {
    const key = TEST_KEYS.hmacKey;
    if (key.length !== 64) throw new Error("HMAC key must be 64 hex chars");
  });

  await task("Verify SHA-256 test vector", () => {
    const { plaintext, sha256 } = TEST_VECTORS;
    if (!plaintext || !sha256) throw new Error("Missing SHA-256 vector");
  });

  await task("Verify SHA3-256 test vector", () => {
    const { sha3_256 } = TEST_VECTORS;
    if (!sha3_256) throw new Error("Missing SHA3-256 vector");
  });

  await task("Verify BLAKE3 test vector", () => {
    const { blake3 } = TEST_VECTORS;
    if (!blake3) throw new Error("Missing BLAKE3 vector");
  });

  summary(8);
}

main();
