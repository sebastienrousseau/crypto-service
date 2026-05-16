// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * WebCrypto Modern Algorithms: feature detection for upcoming browser APIs
 * (ChaCha20-Poly1305, SHA-3, ML-KEM, Argon2, KMAC) with automatic fallback
 * to @noble pure-JS implementations.
 *
 * Demonstrates:
 * - detectModernWebCrypto: check browser/runtime capabilities
 * - modernChaCha20Encrypt / modernChaCha20Decrypt: AEAD round-trip
 * - modernSha3Hash: SHA3-256 and SHA3-512 hashing
 * - Error handling for invalid inputs
 *
 * Run: `npx ts-node examples/webcrypto-modern.ts`
 */

import { header, task, taskResult, summary } from "./support";
import {
  detectModernWebCrypto,
  modernChaCha20Encrypt,
  modernChaCha20Decrypt,
  modernSha3Hash,
} from "../src";
import { randomBytes } from "@noble/ciphers/utils.js";

async function main() {
  header("crypto-lib -- webcrypto-modern");

  // 1. Feature detection
  await task("Detect modern WebCrypto support", () => {
    const support = detectModernWebCrypto();
    // Verify all expected fields exist
    if (typeof support.chacha20poly1305 !== "boolean") throw new Error("Missing chacha20poly1305");
    if (typeof support.sha3 !== "boolean") throw new Error("Missing sha3");
    if (typeof support.mlKem !== "boolean") throw new Error("Missing mlKem");
    if (typeof support.argon2 !== "boolean") throw new Error("Missing argon2");
    if (typeof support.kmac !== "boolean") throw new Error("Missing kmac");
    console.log(`    ChaCha20: ${support.chacha20poly1305}, SHA-3: ${support.sha3}, ML-KEM: ${support.mlKem}`);
  });

  const key = Buffer.from(randomBytes(32)).toString("hex");

  // 2. ChaCha20-Poly1305 encrypt
  const encrypted = await task("modernChaCha20Encrypt: encrypt plaintext", async () => {
    const result = await modernChaCha20Encrypt({
      key,
      plaintext: "Hello, modern WebCrypto!",
    });
    if (!result.ciphertext) throw new Error("No ciphertext output");
    if (typeof result.accelerated !== "boolean") throw new Error("Missing accelerated flag");
    return result;
  });

  // 3. ChaCha20-Poly1305 decrypt
  await task("modernChaCha20Decrypt: decrypt ciphertext", async () => {
    const result = await modernChaCha20Decrypt({
      key,
      ciphertext: encrypted.ciphertext,
    });
    const text = Buffer.from(result.plaintext).toString("utf8");
    if (text !== "Hello, modern WebCrypto!") throw new Error(`Decryption mismatch: "${text}"`);
    if (result.accelerated !== encrypted.accelerated) throw new Error("Acceleration flag mismatch");
  });

  // 4. ChaCha20 with AAD
  await task("modernChaCha20: encrypt/decrypt with AAD", async () => {
    const aad = new TextEncoder().encode("request-id:abc123");
    const enc = await modernChaCha20Encrypt({
      key,
      plaintext: "AAD-protected payload",
      aad,
    });
    const dec = await modernChaCha20Decrypt({
      key,
      ciphertext: enc.ciphertext,
      aad,
    });
    const text = Buffer.from(dec.plaintext).toString("utf8");
    if (text !== "AAD-protected payload") throw new Error("AAD round-trip failed");
  });

  // 5. ChaCha20 with Uint8Array key
  await task("modernChaCha20: Uint8Array key input", async () => {
    const keyBytes = randomBytes(32);
    const enc = await modernChaCha20Encrypt({
      key: keyBytes,
      plaintext: "binary key test",
    });
    const dec = await modernChaCha20Decrypt({
      key: keyBytes,
      ciphertext: enc.ciphertext,
    });
    const text = Buffer.from(dec.plaintext).toString("utf8");
    if (text !== "binary key test") throw new Error("Binary key round-trip failed");
  });

  // 6. SHA3-256 hash
  await task("modernSha3Hash: SHA3-256", async () => {
    const result = await modernSha3Hash({
      algorithm: "SHA3-256",
      data: "hello world",
    });
    if (result.digest.length !== 64) throw new Error("Expected 32-byte (64 hex) SHA3-256 digest");
    if (typeof result.accelerated !== "boolean") throw new Error("Missing accelerated flag");
  });

  // 7. SHA3-512 hash
  await task("modernSha3Hash: SHA3-512", async () => {
    const result = await modernSha3Hash({
      algorithm: "SHA3-512",
      data: "hello world",
    });
    if (result.digest.length !== 128) throw new Error("Expected 64-byte (128 hex) SHA3-512 digest");
  });

  // 8. SHA3 with Uint8Array input
  await task("modernSha3Hash: Uint8Array input", async () => {
    const data = new TextEncoder().encode("binary input for sha3");
    const result = await modernSha3Hash({
      algorithm: "SHA3-256",
      data,
    });
    if (result.digest.length !== 64) throw new Error("Expected 32-byte digest");
  });

  // 9. Error: wrong key for decryption
  await taskResult("Error: decrypt with wrong key", async () => {
    const wrongKey = Buffer.from(randomBytes(32)).toString("hex");
    try {
      await modernChaCha20Decrypt({
        key: wrongKey,
        ciphertext: encrypted.ciphertext,
      });
      throw new Error("Should have thrown");
    } catch (err) {
      if ((err as Error).message === "Should have thrown") throw err;
      // Expected: authentication failure
    }
  });

  summary(9);
}

main();
