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
import {
  createEncryptStream,
  createDecryptStream,
  createHashStream,
} from "../src";
import type { CryptoTransformStream } from "../src/streaming";
import { randomBytes } from "@noble/ciphers/utils.js";

const enc = (s: string) => new TextEncoder().encode(s);

/**
 * Write `chunks` into a TransformStream while reading its output
 * concurrently (reading only after writing can stall on backpressure),
 * and return every output chunk.
 */
async function run<O>(
  stream: CryptoTransformStream<Uint8Array, O>,
  chunks: Uint8Array[],
): Promise<O[]> {
  const out: O[] = [];
  const reading = (async () => {
    const reader = stream.readable.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      out.push(value);
    }
  })();
  const writer = stream.writable.getWriter();
  for (const c of chunks) await writer.write(c);
  await writer.close();
  await reading;
  return out;
}

async function main() {
  header("crypto-lib -- web-streams");

  const key = Buffer.from(randomBytes(32)).toString("hex");

  const ciphertext = await task("Encrypt stream: write chunks, read ciphertext", async () => {
    const [ct] = await run(createEncryptStream({ key }), [
      enc("Hello, "),
      enc("streaming "),
      enc("world!"),
    ]);
    // nonce (24) + plaintext (23) + tag (16) = 63 bytes
    if (!ct || ct.length !== 63) throw new Error(`Unexpected ciphertext length: ${ct?.length}`);
    return ct;
  });

  await task("Decrypt stream: round-trip back to plaintext", async () => {
    const [pt] = await run(createDecryptStream({ key }), [ciphertext]);
    const text = new TextDecoder().decode(pt);
    if (text !== "Hello, streaming world!") throw new Error(`Decryption mismatch: "${text}"`);
  });

  await task("Pipe pattern: encrypt then decrypt", async () => {
    const message = "Piped through encrypt and decrypt streams";
    const [ct] = await run(createEncryptStream({ key }), [enc(message)]);
    const [pt] = await run(createDecryptStream({ key }), [ct!]);
    if (new TextDecoder().decode(pt) !== message) throw new Error("Pipe round-trip failed");
  });

  const hashCases: Array<["sha256" | "blake3" | "sha3-512", string[], number]> = [
    ["sha256", ["chunk1", "chunk2", "chunk3"], 64],
    ["blake3", ["hello blake3"], 64],
    ["sha3-512", ["sha3 data"], 128],
  ];
  for (const [algorithm, chunks, hexLength] of hashCases) {
    await task(`Hash stream: ${algorithm}`, async () => {
      const [result] = await run(createHashStream(algorithm), chunks.map(enc));
      if (!result || result.algorithm !== algorithm) throw new Error("Wrong algorithm");
      if (result.digest.length !== hexLength) throw new Error(`Expected ${hexLength} hex chars`);
    });
  }

  summary(6);
}

main();
