// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Secretbox encrypt and decrypt round-trip via the useEncrypt composable.
 *
 * Demonstrates symmetric authenticated encryption (XChaCha20-Poly1305)
 * with a hex-encoded 256-bit key.
 *
 * Run: `npx ts-node examples/encrypt.ts`
 */

import { header, task, summary } from "./support";
import { useEncrypt } from "../src";

async function main() {
  header("crypto-vue -- encrypt");

  const { encrypt, decrypt, randomKey, ciphertext, plaintext, isProcessing, error } =
    useEncrypt();

  const key = randomKey();
  const message = "Hello, crypto-vue!";

  await task("Generate random 256-bit key", () => {
    if (!key || key.length !== 64) {
      throw new Error("Expected 64-char hex key");
    }
  });

  await task("Encrypt plaintext with secretbox", async () => {
    const ct = await encrypt(key, message);
    if (!ct || ct.length === 0) throw new Error("Ciphertext not produced");
  });

  await task("Decrypt ciphertext back to plaintext", async () => {
    const pt = await decrypt(key, ciphertext.value!);
    if (!pt) throw new Error("Plaintext not produced");
  });

  await task("Verify round-trip integrity", () => {
    if (plaintext.value !== message) {
      throw new Error(`Expected "${message}", got "${plaintext.value}"`);
    }
  });

  await task("Confirm isProcessing is false after completion", () => {
    if (isProcessing.value) throw new Error("Expected isProcessing to be false");
  });

  await task("Confirm no errors occurred", () => {
    if (error.value) throw new Error(`Unexpected error: ${error.value.message}`);
  });

  summary(6);
}

main();
