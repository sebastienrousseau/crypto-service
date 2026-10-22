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
 *   readable.pipeThrough(createEncryptStream({ key })).pipeTo(writable)
 *   readable.pipeThrough(createHashStream("sha256")).pipeTo(writable)
 */

import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3.js";
import { blake3 } from "@noble/hashes/blake3.js";
import {
  AEAD_STREAM_HEADER_LEN,
  aeadStreamReceiver,
  aeadStreamSender,
  toKey,
} from "./stream-aead";
import {
  DEFAULT_CHUNK_SIZE,
  PQ_STREAM_HEADER_LEN,
  pqStreamReceiver,
  pqStreamSender,
  toBytes,
} from "./stream-pq-aead";
import {
  multiPqHeaderLength,
  multiPqStreamReceiver,
  multiPqStreamSender,
  type MultiPqRecipient,
} from "./stream-multi-pq-aead";
import {
  assertChunkSize,
  type ChunkDecryptor,
  type ChunkEncryptor,
} from "./chunks";
import { CryptoError, CryptoErrorCode } from "../errors";
import { concat, toHex } from "../encoding";

/* Node 18+ exposes TransformStream globally; TS ES2023 lib doesn't declare it. */
/** Reference to the global TransformStream constructor. */
const TS = (globalThis as Record<string, unknown>)
  .TransformStream as typeof import("stream/web").TransformStream;

/** A typed TransformStream from `I` chunks to `O` chunks. */
export type CryptoTransformStream<I, O> = import("stream/web").TransformStream<
  I,
  O
>;

/** XChaCha20 nonce length in bytes. */
const NONCE_LEN = 24;

/** Supported hash algorithms for the hash transform stream. */
export type WebStreamHashAlgorithm =
  "sha256" | "sha512" | "sha3-256" | "sha3-512" | "blake3";

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
  /** Chunk size in bytes (default: 65536 = 64 KiB). */
  chunkSize?: number | undefined;
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
  /** Chunk size used during encryption (default: 65536 = 64 KiB). */
  chunkSize?: number | undefined;
  /**
   * `"stream"` (the default) reads the chunked format that
   * {@link createEncryptStream} and `streamEncrypt` write.
   * `"single-message"` reads the format `createEncryptStream` wrote before
   * 0.0.36 (`nonce || ciphertext || tag`); it can only be checked once all
   * of it has arrived, so it is buffered whole.
   */
  format?: "stream" | "single-message" | undefined;
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
): CryptoTransformStream<Uint8Array, HashStreamResult> {
  const factory = hashFactories[algorithm];
  if (!factory) {
    throw new CryptoError(
      `Unsupported hash algorithm: ${algorithm}`,
      CryptoErrorCode.UNSUPPORTED_ALGORITHM,
    );
  }
  const hasher = factory();

  return new TS<Uint8Array, HashStreamResult>({
    transform(chunk: Uint8Array) {
      hasher.update(chunk);
    },
    flush(controller: { enqueue(v: HashStreamResult): void }) {
      const digest = toHex(hasher.digest());
      controller.enqueue({ digest, algorithm });
    },
  });
}

/** Options for creating a post-quantum hybrid encrypt transform stream. */
export interface PqEncryptStreamOptions {
  /** Recipient X25519 public key (32 bytes; hex string or Uint8Array). */
  recipientX25519Public: string | Uint8Array;
  /** Recipient ML-KEM-768 public key (1184 bytes; hex string or Uint8Array). */
  recipientMlKemPublic: string | Uint8Array;
  /** Chunk size in bytes (default: 65536 = 64 KiB). */
  chunkSize?: number | undefined;
}

/** Options for creating a post-quantum hybrid decrypt transform stream. */
export interface PqDecryptStreamOptions {
  /** Recipient X25519 secret key (32 bytes; hex string or Uint8Array). */
  recipientX25519Secret: string | Uint8Array;
  /** Recipient ML-KEM-768 secret key (2400 bytes; hex string or Uint8Array). */
  recipientMlKemSecret: string | Uint8Array;
  /** Chunk size used during encryption (default: 65536 = 64 KiB). */
  chunkSize?: number | undefined;
}

/** Options for creating a multi-recipient post-quantum encrypt transform stream. */
export interface MultiPqEncryptStreamOptions {
  /** List of recipients who will be able to decrypt the stream. */
  recipients: MultiPqRecipient[];
  /** Chunk size in bytes (optional, default: 65536 = 64 KiB). */
  chunkSize?: number | undefined;
}

/** Options for creating a multi-recipient post-quantum decrypt transform stream. */
export interface MultiPqDecryptStreamOptions {
  /** Optional recipient identifier to locate slot directly. */
  recipientId?: string | undefined;
  /** Recipient X25519 secret key (32 bytes; hex string or Uint8Array). */
  recipientX25519Secret: string | Uint8Array;
  /** Recipient ML-KEM-768 secret key (2400 bytes; hex string or Uint8Array). */
  recipientMlKemSecret: string | Uint8Array;
  /** Chunk size override (optional). */
  chunkSize?: number | undefined;
}

/** Something that receives a transform's output. */
type Sink = { enqueue(v: Uint8Array): void };

/**
 * A TransformStream that writes `header`, then each chunk of `encryptor`
 * as soon as the next byte shows it is not the last, then the FINAL chunk
 * when the input ends. It holds at most one chunk of plaintext.
 */
function chunkedEncryptStream(
  start: () => { header: Uint8Array; encryptor: ChunkEncryptor },
  finish: () => void = () => undefined,
): CryptoTransformStream<Uint8Array, Uint8Array> {
  let encryptor: ChunkEncryptor;
  return new TS<Uint8Array, Uint8Array>({
    start(controller: Sink) {
      const started = start();
      encryptor = started.encryptor;
      controller.enqueue(started.header);
    },
    transform(chunk: Uint8Array, controller: Sink) {
      for (const sealed of encryptor.push(chunk)) controller.enqueue(sealed);
    },
    flush(controller: Sink) {
      controller.enqueue(encryptor.finish());
      finish();
    },
  });
}

/**
 * A TransformStream that collects the header (whose length `headerLength`
 * reports once it can), opens it with `open`, then emits each chunk's
 * plaintext as soon as the chunk is in. It holds at most one chunk.
 */
function chunkedDecryptStream(
  headerLength: (bytes: Uint8Array) => number | undefined,
  open: (header: Uint8Array) => {
    decryptor: ChunkDecryptor;
    wipe?: () => void;
  },
): CryptoTransformStream<Uint8Array, Uint8Array> {
  let pending = new Uint8Array(0);
  let opened: { decryptor: ChunkDecryptor; wipe?: () => void } | undefined;
  return new TS<Uint8Array, Uint8Array>({
    transform(chunk: Uint8Array, controller: Sink) {
      if (opened === undefined) {
        pending = Uint8Array.from(concat([pending, chunk]));
        const length = headerLength(pending);
        if (length === undefined) return;
        opened = open(pending.subarray(0, length));
        chunk = pending.subarray(length);
      }
      for (const plain of opened.decryptor.push(chunk)) {
        controller.enqueue(plain);
      }
    },
    flush(controller: Sink) {
      if (opened === undefined) {
        throw new CryptoError(
          "Ciphertext too short — missing header or chunk data",
          CryptoErrorCode.INVALID_CIPHERTEXT,
        );
      }
      try {
        controller.enqueue(opened.decryptor.finish());
      } finally {
        opened.wipe?.();
      }
    },
  });
}

/**
 * Create a TransformStream that encrypts data with XChaCha20-Poly1305 in
 * the STREAM construction.
 *
 * Emits the header (a fresh 24-byte base nonce) at once and each chunk as
 * soon as the next byte shows it is not the last, so it holds at most one
 * chunk of plaintext; the output is the same as `streamEncrypt`'s.
 *
 * @example
 * ```ts
 * const key = "aa".repeat(32);
 * await readable
 *   .pipeThrough(createEncryptStream({ key }))
 *   .pipeTo(writable);
 * ```
 *
 * @param options - The 256-bit key and an optional chunk size.
 * @returns A TransformStream that accepts plaintext Uint8Array chunks and emits ciphertext.
 */
export function createEncryptStream(
  options: EncryptStreamOptions,
): CryptoTransformStream<Uint8Array, Uint8Array> {
  const key = toKey(options.key);
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  assertChunkSize(chunkSize);
  return chunkedEncryptStream(() => aeadStreamSender(key, chunkSize));
}

/**
 * Create a TransformStream that decrypts what {@link createEncryptStream}
 * or `streamEncrypt` wrote.
 *
 * Emits each chunk's plaintext once the chunk has arrived and
 * authenticated. A stream that ends early errors instead of ending
 * normally, but plaintext already emitted is not withdrawn: treat the
 * output as complete only once the stream closes without error. With
 * `format: "single-message"`, it reads the pre-0.0.36 format instead.
 *
 * @example
 * ```ts
 * const key = "aa".repeat(32);
 * await encrypted
 *   .pipeThrough(createDecryptStream({ key }))
 *   .pipeTo(writable);
 * ```
 *
 * @param options - The 256-bit key, the chunk size used to encrypt and the format.
 * @returns A TransformStream that accepts ciphertext Uint8Array chunks and emits plaintext.
 */
export function createDecryptStream(
  options: DecryptStreamOptions,
): CryptoTransformStream<Uint8Array, Uint8Array> {
  const key = toKey(options.key);
  if (options.format === "single-message") return singleMessageDecrypt(key);
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  assertChunkSize(chunkSize);
  return chunkedDecryptStream(
    (bytes) =>
      bytes.length >= AEAD_STREAM_HEADER_LEN
        ? AEAD_STREAM_HEADER_LEN
        : undefined,
    (header) => ({ decryptor: aeadStreamReceiver(key, header, chunkSize) }),
  );
}

/**
 * Decrypts the single XChaCha20-Poly1305 message (`nonce || ciphertext ||
 * tag`) that `createEncryptStream` wrote before 0.0.36. Its one tag covers
 * the whole message, so nothing can be released before all of it is in.
 */
function singleMessageDecrypt(
  key: Uint8Array,
): CryptoTransformStream<Uint8Array, Uint8Array> {
  const parts: Uint8Array[] = [];
  return new TS<Uint8Array, Uint8Array>({
    transform(chunk: Uint8Array) {
      parts.push(chunk);
    },
    flush(controller: Sink) {
      const message = Uint8Array.from(concat(parts));
      if (message.length < NONCE_LEN + 16) {
        throw new CryptoError(
          "Ciphertext too short — missing nonce or auth tag",
          CryptoErrorCode.INVALID_CIPHERTEXT,
        );
      }
      const nonce = message.subarray(0, NONCE_LEN);
      controller.enqueue(
        xchacha20poly1305(key, nonce).decrypt(message.subarray(NONCE_LEN)),
      );
    },
  });
}

/**
 * Create a TransformStream that encrypts data using hybrid post-quantum
 * STREAM (X25519 + ML-KEM-768).
 *
 * Emits the header at once and each chunk as soon as the next byte shows
 * it is not the last, so it holds at most one chunk of plaintext; the
 * output is the same as `streamPqEncrypt`'s.
 *
 * @param options - Encryption parameters including recipient public keys.
 * @returns A TransformStream that accepts plaintext Uint8Array chunks and emits ciphertext.
 */
export function createPqEncryptStream(
  options: PqEncryptStreamOptions,
): CryptoTransformStream<Uint8Array, Uint8Array> {
  const recipX25519Pub = toBytes(
    options.recipientX25519Public,
    32,
    "recipientX25519Public",
  );
  const recipMlKemPub = toBytes(
    options.recipientMlKemPublic,
    1184,
    "recipientMlKemPublic",
  );
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  assertChunkSize(chunkSize);
  return chunkedEncryptStream(() =>
    pqStreamSender(recipX25519Pub, recipMlKemPub, chunkSize),
  );
}

/**
 * Create a TransformStream that decrypts hybrid post-quantum STREAM
 * ciphertext.
 *
 * Decapsulates as soon as the header is in, then emits each chunk's
 * plaintext once the chunk has arrived and authenticated. A stream that
 * ends early errors instead of ending normally, but plaintext already
 * emitted is not withdrawn: treat the output as complete only once the
 * stream closes without error.
 *
 * @param options - Decryption parameters including recipient secret keys.
 * @returns A TransformStream that accepts ciphertext Uint8Array chunks and emits plaintext.
 */
export function createPqDecryptStream(
  options: PqDecryptStreamOptions,
): CryptoTransformStream<Uint8Array, Uint8Array> {
  const recipX25519Sec = toBytes(
    options.recipientX25519Secret,
    32,
    "recipientX25519Secret",
  );
  const recipMlKemSec = toBytes(
    options.recipientMlKemSecret,
    2400,
    "recipientMlKemSecret",
  );
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  assertChunkSize(chunkSize);
  return chunkedDecryptStream(
    (bytes) =>
      bytes.length >= PQ_STREAM_HEADER_LEN ? PQ_STREAM_HEADER_LEN : undefined,
    (header) => ({
      decryptor: pqStreamReceiver(
        recipX25519Sec,
        recipMlKemSec,
        header,
        chunkSize,
      ),
    }),
  );
}

/**
 * Create a TransformStream that encrypts data for multiple recipients
 * using hybrid post-quantum STREAM.
 *
 * Emits the header (one key slot per recipient) at once and each chunk as
 * soon as the next byte shows it is not the last; the output is the same
 * as `streamMultiPqEncrypt`'s.
 *
 * @param options - Encryption parameters including recipients array and optional chunk size.
 * @returns A TransformStream that accepts plaintext Uint8Array chunks and emits ciphertext.
 */
export function createMultiPqEncryptStream(
  options: MultiPqEncryptStreamOptions,
): CryptoTransformStream<Uint8Array, Uint8Array> {
  let started: ReturnType<typeof multiPqStreamSender>;
  return chunkedEncryptStream(
    () => (started = multiPqStreamSender(options)),
    () => started.wipe(),
  );
}

/**
 * Create a TransformStream that decrypts multi-recipient hybrid
 * post-quantum STREAM ciphertext.
 *
 * Opens the recipient's key slot as soon as the header is in, then emits
 * each chunk's plaintext once the chunk has arrived and authenticated; as
 * for {@link createPqDecryptStream}, only a stream that closes without
 * error is complete.
 *
 * @param options - Decryption parameters including recipient secret keys and optional recipient ID.
 * @returns A TransformStream that accepts ciphertext Uint8Array chunks and emits plaintext.
 */
export function createMultiPqDecryptStream(
  options: MultiPqDecryptStreamOptions,
): CryptoTransformStream<Uint8Array, Uint8Array> {
  return chunkedDecryptStream(multiPqHeaderLength, (header) =>
    multiPqStreamReceiver(options, header),
  );
}
