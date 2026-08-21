// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Web Streams API: TransformStream-based encryption and hashing for
 * streaming data in Node 18+, Deno, browsers, and Cloudflare Workers.
 *
 * Demonstrates:
 * - createEncryptStream + createDecryptStream round-trip
 * - createHashStream with multiple chunks
 * - Pipe pattern (encrypt → decrypt)
 * - Multiple hash algorithms
 *
 * Run: `npx ts-node examples/web-streams.ts`
 */

import { header, task, summary } from "./support";
import { createEncryptStream, createDecryptStream, createHashStream } from "../src";
import { randomBytes } from "@noble/ciphers/utils.js";

async function main() {
  header("crypto-lib -- web-streams");

  const key = Buffer.from(randomBytes(32)).toString("hex");

  // 1. Encrypt stream: write plaintext → read ciphertext
  const ciphertext = await task("Encrypt stream: write chunks, read ciphertext", async () => {
    const encStream = createEncryptStream({ key });
    const writer = encStream.writable.getWriter();
    await writer.write(new TextEncoder().encode("Hello, "));
    await writer.write(new TextEncoder().encode("streaming "));
    await writer.write(new TextEncoder().encode("world!"));
    await writer.close();

    const reader = encStream.readable.getReader();
    const { value } = await reader.read();
    if (!value || value.length === 0) throw new Error("No ciphertext output");
    // Ciphertext should be nonce (24) + plaintext (23) + tag (16) = 63 bytes
    if (value.length !== 63) throw new Error(`Unexpected ciphertext length: ${value.length}`);
    return value as Uint8Array;
  });

  // 2. Decrypt stream: write ciphertext → read plaintext
  await task("Decrypt stream: round-trip back to plaintext", async () => {
    const decStream = createDecryptStream({ key });
    const writer = decStream.writable.getWriter();
    await writer.write(ciphertext);
    await writer.close();

    const reader = decStream.readable.getReader();
    const { value } = await reader.read();
    if (!value) throw new Error("No plaintext output");
    const text = new TextDecoder().decode(value);
    if (text !== "Hello, streaming world!") throw new Error(`Decryption mismatch: "${text}"`);
  });

  // 3. Encrypt → Decrypt pipe pattern
  await task("Pipe pattern: encrypt → decrypt in one pipeline", async () => {
    const message = "Piped through encrypt and decrypt streams";
    const encStream = createEncryptStream({ key });
    const decStream = createDecryptStream({ key });

    // Write plaintext into encryption stream
    const encWriter = encStream.writable.getWriter();
    await encWriter.write(new TextEncoder().encode(message));
    await encWriter.close();

    // Read ciphertext from encrypt, write into decrypt
    const encReader = encStream.readable.getReader();
    const { value: ct } = await encReader.read();

    const decWriter = decStream.writable.getWriter();
    await decWriter.write(ct!);
    await decWriter.close();

    // Read plaintext from decrypt
    const decReader = decStream.readable.getReader();
    const { value: pt } = await decReader.read();
    const recovered = new TextDecoder().decode(pt);
    if (recovered !== message) throw new Error("Pipe round-trip failed");
  });

  // 4. Hash stream with SHA-256
  await task("Hash stream: SHA-256 with multiple chunks", async () => {
    const hashStream = createHashStream("sha256");
    const writer = hashStream.writable.getWriter();
    await writer.write(new TextEncoder().encode("chunk1"));
    await writer.write(new TextEncoder().encode("chunk2"));
    await writer.write(new TextEncoder().encode("chunk3"));
    await writer.close();

    const reader = hashStream.readable.getReader();
    const { value } = await reader.read();
    if (!value) throw new Error("No hash output");
    if (value.algorithm !== "sha256") throw new Error("Wrong algorithm");
    if (value.digest.length !== 64) throw new Error("Expected 32-byte (64 hex) SHA-256 digest");
  });

  // 5. Hash stream with BLAKE3
  await task("Hash stream: BLAKE3", async () => {
    const hashStream = createHashStream("blake3");
    const writer = hashStream.writable.getWriter();
    await writer.write(new TextEncoder().encode("hello blake3"));
    await writer.close();

    const reader = hashStream.readable.getReader();
    const { value } = await reader.read();
    if (!value) throw new Error("No hash output");
    if (value.algorithm !== "blake3") throw new Error("Wrong algorithm");
    if (value.digest.length !== 64) throw new Error("Expected 32-byte (64 hex) BLAKE3 digest");
  });

  // 6. Hash stream with SHA3-512
  await task("Hash stream: SHA3-512", async () => {
    const hashStream = createHashStream("sha3-512");
    const writer = hashStream.writable.getWriter();
    await writer.write(new TextEncoder().encode("sha3 data"));
    await writer.close();

    const reader = hashStream.readable.getReader();
    const { value } = await reader.read();
    if (!value) throw new Error("No hash output");
    if (value.algorithm !== "sha3-512") throw new Error("Wrong algorithm");
    if (value.digest.length !== 128) throw new Error("Expected 64-byte (128 hex) SHA3-512 digest");
  });

  summary(6);
}

main();
