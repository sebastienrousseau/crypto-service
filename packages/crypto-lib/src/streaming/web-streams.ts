/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Web Streams API wrappers for streaming encryption and hashing.
 *
 * Provides TransformStream-based wrappers around the existing streaming
 * AEAD and hash modules. Works in Node 18+, Deno, browsers, and
 * Cloudflare Workers.
 *
 * Usage:
 *   readable.pipeThrough(createEncryptStream(key)).pipeTo(writable)
 *   readable.pipeThrough(createHashStream("sha256")).pipeTo(writable)
 */

import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3.js";
import { blake3 } from "@noble/hashes/blake3.js";

/* Node 18+ exposes TransformStream globally; TS ES2023 lib doesn't declare it. */
const TS = (globalThis as Record<string, unknown>)
  .TransformStream as typeof import("stream/web").TransformStream;

const NONCE_LEN = 24;

/** Supported hash algorithms for the hash transform stream. */
export type WebStreamHashAlgorithm =
  | "sha256"
  | "sha512"
  | "sha3-256"
  | "sha3-512"
  | "blake3";

/**
 * Array of all supported web-stream hash algorithm identifiers.
 *
 * @example
 * ```ts
 * for (const algo of WEB_STREAM_HASH_ALGORITHMS) {
 *   const ts = createHashStream(algo);
 * }
 * ```
 */
export const WEB_STREAM_HASH_ALGORITHMS: readonly WebStreamHashAlgorithm[] = [
  "sha256",
  "sha512",
  "sha3-256",
  "sha3-512",
  "blake3",
] as const;

/**
 * Result emitted by the hash transform stream after all data is processed.
 *
 * @example
 * ```ts
 * const result: HashStreamResult = { digest: "abc...", algorithm: "sha256" };
 * ```
 */
export interface HashStreamResult {
  /** Hex-encoded hash digest. */
  digest: string;
  /** Algorithm used. */
  algorithm: WebStreamHashAlgorithm;
}

/**
 * Options for creating an encrypt transform stream.
 *
 * @example
 * ```ts
 * const opts: EncryptStreamOptions = { key: "aa".repeat(32) };
 * ```
 */
export interface EncryptStreamOptions {
  /** 256-bit key as hex string or Uint8Array. */
  key: string | Uint8Array;
}

/**
 * Options for creating a decrypt transform stream.
 *
 * @example
 * ```ts
 * const opts: DecryptStreamOptions = { key: "aa".repeat(32) };
 * ```
 */
export interface DecryptStreamOptions {
  /** 256-bit key as hex string or Uint8Array. */
  key: string | Uint8Array;
}

const HEX_RE = /^[0-9a-fA-F]*$/;

function toKey(key: string | Uint8Array): Uint8Array {
  if (key instanceof Uint8Array) {
    if (key.length !== 32) {
      throw new Error(`Key must be 32 bytes, got ${key.length}`);
    }
    return key;
  }
  if (!HEX_RE.test(key)) throw new Error("Invalid hex key");
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) {
    throw new Error(`Key must be 32 bytes (256 bits), got ${buf.length}`);
  }
  return buf;
}

interface HashLike {
  update(data: Uint8Array): HashLike;
  digest(): Uint8Array;
}

const hashFactories: Record<WebStreamHashAlgorithm, () => HashLike> = {
  sha256: () => sha256.create(),
  sha512: () => sha512.create(),
  "sha3-256": () => sha3_256.create(),
  "sha3-512": () => sha3_512.create(),
  blake3: () => blake3.create(),
};

/**
 * Create a TransformStream that encrypts data with XChaCha20-Poly1305.
 *
 * Accumulates all input chunks, then on flush encrypts the combined
 * plaintext and emits `nonce (24 B) || ciphertext || tag (16 B)`.
 *
 * @example
 * ```ts
 * const key = "aa".repeat(32);
 * const stream = createEncryptStream({ key });
 * const writer = stream.writable.getWriter();
 * await writer.write(new Uint8Array([1, 2, 3]));
 * await writer.close();
 * ```
 *
 * @param options - Encryption options containing the 256-bit key.
 * @returns A TransformStream that accepts Uint8Array chunks and emits encrypted output.
 */
export function createEncryptStream(
  options: EncryptStreamOptions,
): InstanceType<typeof TS> {
  const keyBytes = toKey(options.key);
  const chunks: Uint8Array[] = [];
  let totalLen = 0;

  return new TS({
    transform(chunk: Uint8Array) {
      chunks.push(chunk);
      totalLen += chunk.length;
    },
    flush(controller: { enqueue(v: Uint8Array): void }) {
      // Assemble plaintext
      const plaintext = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        plaintext.set(c, offset);
        offset += c.length;
      }

      const nonce = randomBytes(NONCE_LEN);
      const cipher = xchacha20poly1305(keyBytes, nonce);
      const encrypted = cipher.encrypt(plaintext);

      // Output: nonce || ciphertext+tag
      const output = new Uint8Array(NONCE_LEN + encrypted.length);
      output.set(nonce, 0);
      output.set(encrypted, NONCE_LEN);
      controller.enqueue(output);
    },
  });
}

/**
 * Create a TransformStream that decrypts XChaCha20-Poly1305 data.
 *
 * Accumulates all input chunks (expecting `nonce || ciphertext || tag`),
 * then on flush decrypts and emits the plaintext.
 *
 * @example
 * ```ts
 * const key = "aa".repeat(32);
 * const stream = createDecryptStream({ key });
 * const writer = stream.writable.getWriter();
 * await writer.write(ciphertext);
 * await writer.close();
 * ```
 *
 * @param options - Decryption options containing the 256-bit key.
 * @returns A TransformStream that accepts encrypted Uint8Array chunks and emits plaintext.
 */
export function createDecryptStream(
  options: DecryptStreamOptions,
): InstanceType<typeof TS> {
  const keyBytes = toKey(options.key);
  const chunks: Uint8Array[] = [];
  let totalLen = 0;

  return new TS({
    transform(chunk: Uint8Array) {
      chunks.push(chunk);
      totalLen += chunk.length;
    },
    flush(controller: { enqueue(v: Uint8Array): void }) {
      // Assemble ciphertext
      const ciphertext = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        ciphertext.set(c, offset);
        offset += c.length;
      }

      if (ciphertext.length < NONCE_LEN + 16) {
        throw new Error("Ciphertext too short — missing nonce or auth tag");
      }

      const nonce = ciphertext.subarray(0, NONCE_LEN);
      const encrypted = ciphertext.subarray(NONCE_LEN);
      const cipher = xchacha20poly1305(keyBytes, nonce);
      const plaintext = cipher.decrypt(encrypted);
      controller.enqueue(plaintext);
    },
  });
}

/**
 * Create a TransformStream that computes a hash digest.
 *
 * Each input chunk is fed to the incremental hasher. On flush, a
 * {@link HashStreamResult} containing the hex digest and algorithm name
 * is emitted.
 *
 * @example
 * ```ts
 * const stream = createHashStream("sha256");
 * const writer = stream.writable.getWriter();
 * await writer.write(new TextEncoder().encode("hello"));
 * await writer.close();
 * const reader = stream.readable.getReader();
 * const { value } = await reader.read();
 * console.log(value.digest); // hex string
 * ```
 *
 * @param algorithm - The hash algorithm to use.
 * @returns A TransformStream that accepts Uint8Array chunks and emits a HashStreamResult.
 */
export function createHashStream(
  algorithm: WebStreamHashAlgorithm,
): InstanceType<typeof TS> {
  const factory = hashFactories[algorithm];
  if (!factory) {
    throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  }
  const hasher = factory();

  return new TS({
    transform(chunk: Uint8Array) {
      hasher.update(chunk);
    },
    flush(controller: { enqueue(v: HashStreamResult): void }) {
      const digest = Buffer.from(hasher.digest()).toString("hex");
      controller.enqueue({ digest, algorithm });
    },
  });
}
