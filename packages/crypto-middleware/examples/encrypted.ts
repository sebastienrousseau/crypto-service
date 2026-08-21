// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Full encrypted request/response pipeline.
 *
 * Demonstrates the complete flow:
 *   1. Client encrypts a JSON payload using encryptPayload.
 *   2. Server decrypts the payload using decryptPayload.
 *   3. Server re-encrypts the response.
 *   4. Client decrypts the response.
 *
 * Run: `npx ts-node examples/encrypted.ts`
 */

import { header, task, summary } from "./support";
import { encryptPayload, decryptPayload, CryptoMiddlewareError } from "../src";

const KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

async function main() {
  header("crypto-middleware -- encrypted");

  await task("Encrypt a JSON payload", async () => {
    const sealed = encryptPayload(KEY, { message: "hello", count: 42 });
    if (typeof sealed !== "string" || sealed.length === 0) {
      throw new Error("Expected non-empty sealed string");
    }
  });

  await task("Round-trip encrypt then decrypt", async () => {
    const original = { userId: 1, role: "admin" };
    const sealed = encryptPayload(KEY, original);
    const decrypted = decryptPayload(KEY, sealed) as Record<string, unknown>;
    if (decrypted.userId !== 1 || decrypted.role !== "admin") {
      throw new Error("Round-trip mismatch");
    }
  });

  await task("Encrypt and decrypt a string payload", async () => {
    const sealed = encryptPayload(KEY, "plain text data");
    const decrypted = decryptPayload(KEY, sealed);
    if (decrypted !== "plain text data") {
      throw new Error("String round-trip mismatch");
    }
  });

  await task("Reject decryption with wrong key", async () => {
    const sealed = encryptPayload(KEY, { secret: true });
    const wrongKey = "f".repeat(64);
    try {
      decryptPayload(wrongKey, sealed);
      throw new Error("Should have thrown");
    } catch (err) {
      if (!(err instanceof CryptoMiddlewareError)) throw err;
      if (err.code !== "DECRYPTION_FAILED") {
        throw new Error("Expected DECRYPTION_FAILED");
      }
    }
  });

  await task("Reject decryption of corrupted ciphertext", async () => {
    try {
      decryptPayload(KEY, "not-valid-base64-sealed-box");
      throw new Error("Should have thrown");
    } catch (err) {
      if (!(err instanceof CryptoMiddlewareError)) throw err;
    }
  });

  summary(5);
}

main();
