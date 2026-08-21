// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * WASM Bridge: optional high-performance crypto via WebAssembly with
 * transparent fallback to @noble pure-JS implementations.
 *
 * Demonstrates:
 * - detectWasmBackend: check runtime WASM capabilities
 * - wasmHash: hash with all supported algorithms (sha256, sha512, sha3-256, sha3-512, blake3)
 * - wasmAeadEncrypt / wasmAeadDecrypt: XChaCha20-Poly1305 round-trip
 * - AEAD with additional authenticated data (AAD)
 *
 * Run: `npx ts-node examples/wasm-bridge.ts`
 */

import { header, task, taskResult, summary } from "./support";
import { detectWasmBackend, wasmHash, wasmAeadEncrypt, wasmAeadDecrypt } from "../src";
import { randomBytes } from "@noble/ciphers/utils.js";

async function main() {
  header("crypto-lib -- wasm-bridge");

  // 1. Detect WASM backend
  await task("Detect WASM backend", () => {
    const backend = detectWasmBackend();
    const valid = ["wasm-simd", "wasm", "js"];
    if (!valid.includes(backend)) throw new Error(`Unexpected backend: ${backend}`);
    console.log(`    Backend: ${backend}`);
  });

  // 2. Hash with SHA-256
  await task("wasmHash: SHA-256", () => {
    const result = wasmHash({ algorithm: "sha256", data: "hello world" });
    if (result.algorithm !== "sha256") throw new Error("Wrong algorithm");
    if (result.digest.length !== 64) throw new Error("Expected 32-byte digest");
    // Known SHA-256 of "hello world"
    if (result.digest !== "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9") {
      throw new Error("Unexpected SHA-256 digest");
    }
  });

  // 3. Hash with SHA-512
  await task("wasmHash: SHA-512", () => {
    const result = wasmHash({ algorithm: "sha512", data: "hello world" });
    if (result.algorithm !== "sha512") throw new Error("Wrong algorithm");
    if (result.digest.length !== 128) throw new Error("Expected 64-byte digest");
  });

  // 4. Hash with SHA3-256
  await task("wasmHash: SHA3-256", () => {
    const result = wasmHash({ algorithm: "sha3-256", data: "hello world" });
    if (result.algorithm !== "sha3-256") throw new Error("Wrong algorithm");
    if (result.digest.length !== 64) throw new Error("Expected 32-byte digest");
  });

  // 5. Hash with SHA3-512
  await task("wasmHash: SHA3-512", () => {
    const result = wasmHash({ algorithm: "sha3-512", data: "hello world" });
    if (result.algorithm !== "sha3-512") throw new Error("Wrong algorithm");
    if (result.digest.length !== 128) throw new Error("Expected 64-byte digest");
  });

  // 6. Hash with BLAKE3
  await task("wasmHash: BLAKE3", () => {
    const result = wasmHash({ algorithm: "blake3", data: "hello world" });
    if (result.algorithm !== "blake3") throw new Error("Wrong algorithm");
    if (result.digest.length !== 64) throw new Error("Expected 32-byte digest");
  });

  // 7. Hash with hex-encoded input
  await task("wasmHash: hex-encoded input", () => {
    const hexData = Buffer.from("test data").toString("hex");
    const result = wasmHash({ algorithm: "sha256", data: hexData, encoding: "hex" });
    if (result.algorithm !== "sha256") throw new Error("Wrong algorithm");
    if (result.digest.length !== 64) throw new Error("Expected 32-byte digest");
  });

  // 8. AEAD encrypt/decrypt round-trip
  const key = Buffer.from(randomBytes(32)).toString("hex");

  await task("wasmAeadEncrypt/Decrypt: round-trip", () => {
    const encrypted = wasmAeadEncrypt({ key, plaintext: "secret message" });
    if (!encrypted.ciphertext) throw new Error("No ciphertext");
    const decrypted = wasmAeadDecrypt({ key, ciphertext: encrypted.ciphertext });
    const text = Buffer.from(decrypted.plaintext).toString("utf8");
    if (text !== "secret message") throw new Error(`Decryption mismatch: "${text}"`);
  });

  // 9. AEAD with Uint8Array input
  await task("wasmAeadEncrypt/Decrypt: Uint8Array plaintext", () => {
    const data = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0xca, 0xfe]);
    const encrypted = wasmAeadEncrypt({ key, plaintext: data });
    const decrypted = wasmAeadDecrypt({ key, ciphertext: encrypted.ciphertext });
    if (Buffer.from(decrypted.plaintext).toString("hex") !== "deadbeefcafe") {
      throw new Error("Binary round-trip failed");
    }
  });

  // 10. AEAD with AAD
  await task("wasmAeadEncrypt/Decrypt: with AAD", () => {
    const aad = new TextEncoder().encode("associated-data-context");
    const encrypted = wasmAeadEncrypt({ key, plaintext: "aad-protected", aad });
    const decrypted = wasmAeadDecrypt({ key, ciphertext: encrypted.ciphertext, aad });
    const text = Buffer.from(decrypted.plaintext).toString("utf8");
    if (text !== "aad-protected") throw new Error("AAD round-trip failed");
  });

  // 11. Error: wrong key for decryption
  await taskResult("Error: decrypt with wrong key", () => {
    const encrypted = wasmAeadEncrypt({ key, plaintext: "test" });
    const wrongKey = Buffer.from(randomBytes(32)).toString("hex");
    try {
      wasmAeadDecrypt({ key: wrongKey, ciphertext: encrypted.ciphertext });
      throw new Error("Should have thrown");
    } catch (err) {
      if ((err as Error).message === "Should have thrown") throw err;
      // Expected: decryption failure
    }
  });

  summary(11);
}

main();
