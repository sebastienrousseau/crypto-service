// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Secretbox encrypt and decrypt round-trip via the useEncrypt hook.
 *
 * Demonstrates symmetric authenticated encryption (XChaCha20-Poly1305)
 * with a hex-encoded 256-bit key.
 *
 * Run: `npx ts-node examples/encrypt.ts`
 */

import { header, task, summary } from "./support";
import { useEncrypt } from "../src";
import { randomBytes } from "node:crypto";

async function main() {
  header("crypto-react -- encrypt");

  const key = randomBytes(32).toString("hex");
  const message = "Hello, crypto-react!";

  // useEncrypt reads from CryptoProvider context; here we pass the key directly
  const { encrypt, decrypt, ciphertext, plaintext, isProcessing } =
    useEncrypt();

  await task("Encrypt plaintext with secretbox", () => {
    encrypt(message, key);
    if (!ciphertext) throw new Error("Ciphertext not produced");
  });

  await task("Decrypt ciphertext back to plaintext", () => {
    if (!ciphertext) throw new Error("No ciphertext to decrypt");
    decrypt(ciphertext, key);
    if (!plaintext) throw new Error("Plaintext not produced");
  });

  await task("Verify round-trip integrity", () => {
    if (plaintext !== message) {
      throw new Error(`Expected "${message}", got "${plaintext}"`);
    }
  });

  await task("Confirm isProcessing flag is false after completion", () => {
    if (isProcessing) throw new Error("Expected isProcessing to be false");
  });

  summary(4);
}

main();
