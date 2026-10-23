/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Chunk layout shared by the streaming AEAD constructions.
 */

import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { CryptoError, CryptoErrorCode } from "../errors";
import { concat } from "../encoding";

/**
 * Throw unless `chunkSize` is a positive integer. Zero made encryption
 * loop forever, and NaN or a negative size produced a stream with no
 * chunks, silently dropping the plaintext.
 */
export function assertChunkSize(chunkSize: number): void {
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1) {
    throw new CryptoError(
      `chunkSize must be a positive integer, got ${chunkSize}`,
      CryptoErrorCode.INVALID_INPUT,
    );
  }
}

/** Poly1305 authentication tag length in bytes. */
export const TAG_LEN = 16;
/** Chunk tag byte for intermediate chunks. */
export const CHUNK_TAG_MESSAGE = 0x00;
/** Chunk tag byte for the final chunk. */
export const CHUNK_TAG_FINAL = 0x01;

/** Derives the nonce of chunk `counter` from the stream's base nonce. */
export type ChunkNonce = (
  baseNonce: Uint8Array,
  counter: number,
  tag: number,
) => Uint8Array;

/**
 * Number of chunks for `ptLen` bytes of plaintext. An empty plaintext
 * still has one (final) chunk, which authenticates the empty stream.
 */
export function chunkCount(ptLen: number, chunkSize: number): number {
  return Math.max(1, Math.ceil(ptLen / chunkSize));
}

/**
 * Size of an encrypted stream: the header, the plaintext, and per chunk
 * a tag byte and a Poly1305 tag.
 */
export function streamSize(
  headerLen: number,
  ptLen: number,
  chunkSize: number,
): number {
  return headerLen + ptLen + chunkCount(ptLen, chunkSize) * (1 + TAG_LEN);
}

/** Bytes received but not yet processed, kept as a list of parts. */
class ByteQueue {
  private parts: Uint8Array[] = [];
  /** Number of bytes queued. */
  length = 0;

  /** Appends `data`. */
  push(data: Uint8Array): void {
    if (data.length === 0) return;
    this.parts.push(data);
    this.length += data.length;
  }

  /** The byte at the front of the queue. */
  first(): number {
    return this.parts[0]![0]!;
  }

  /** Removes and returns the first `n` bytes. */
  take(n: number): Uint8Array {
    const out = new Uint8Array(n);
    let filled = 0;
    while (filled < n) {
      const part = this.parts[0]!;
      const used = Math.min(part.length, n - filled);
      out.set(part.subarray(0, used), filled);
      filled += used;
      if (used === part.length) this.parts.shift();
      else this.parts[0] = part.subarray(used);
    }
    this.length -= n;
    return out;
  }
}

/**
 * Encrypts a stream chunk by chunk as plaintext arrives. A chunk is sealed
 * once more plaintext follows it, so it is known not to be the last; the
 * last is sealed FINAL by {@link ChunkEncryptor.finish}. The output is the
 * same, byte for byte, however the plaintext is split.
 */
export class ChunkEncryptor {
  private readonly queue = new ByteQueue();
  private counter = 0;

  constructor(
    private readonly key: Uint8Array,
    private readonly baseNonce: Uint8Array,
    private readonly chunkSize: number,
    private readonly chunkNonce: ChunkNonce,
  ) {
    assertChunkSize(chunkSize);
  }

  /** Adds plaintext; returns the chunks it completes. */
  push(plaintext: Uint8Array): Uint8Array[] {
    this.queue.push(plaintext);
    const out: Uint8Array[] = [];
    while (this.queue.length > this.chunkSize) {
      out.push(this.seal(this.queue.take(this.chunkSize), CHUNK_TAG_MESSAGE));
    }
    return out;
  }

  /** Ends the stream; returns its FINAL chunk. */
  finish(): Uint8Array {
    return this.seal(this.queue.take(this.queue.length), CHUNK_TAG_FINAL);
  }

  /** Tag byte followed by the chunk's ciphertext. */
  private seal(chunk: Uint8Array, tag: number): Uint8Array {
    const nonce = this.chunkNonce(this.baseNonce, this.counter++, tag);
    const encrypted = xchacha20poly1305(this.key, nonce).encrypt(chunk);
    const out = new Uint8Array(1 + encrypted.length);
    out[0] = tag;
    out.set(encrypted, 1);
    return out;
  }
}

/** Messages a {@link ChunkDecryptor} throws for a cut-short stream. */
export interface TruncationMessages {
  /** A chunk that ends before its length. */
  incomplete: string;
  /** A stream that ends without a FINAL chunk. */
  finalMissing: string;
}

/** The messages of the single-recipient formats. */
const TRUNCATED: TruncationMessages = {
  incomplete: "Ciphertext truncated — incomplete chunk",
  finalMissing: "Ciphertext truncated — final chunk missing",
};

/**
 * Decrypts a stream chunk by chunk as ciphertext arrives. A MESSAGE chunk
 * is opened as soon as all of it is in; the FINAL chunk runs to the end of
 * the stream, so {@link ChunkDecryptor.finish} opens it. At most one chunk
 * is held at a time: a FINAL chunk longer than a chunk is refused.
 *
 * Given several keys, newest first, it opens the first chunk with each in
 * turn and keeps the first that authenticates, so a stream written under
 * an earlier key derivation still opens.
 */
export class ChunkDecryptor {
  private readonly queue = new ByteQueue();
  private counter = 0;
  private key: Uint8Array | undefined;

  constructor(
    private readonly keys: Uint8Array | readonly Uint8Array[],
    private readonly baseNonce: Uint8Array,
    private readonly chunkSize: number,
    private readonly chunkNonce: ChunkNonce,
    private readonly truncated: TruncationMessages = TRUNCATED,
  ) {
    assertChunkSize(chunkSize);
  }

  /** Adds ciphertext; returns the plaintext of the chunks it completes. */
  push(ciphertext: Uint8Array): Uint8Array[] {
    this.queue.push(ciphertext);
    const full = 1 + this.chunkSize + TAG_LEN;
    const out: Uint8Array[] = [];
    while (this.queue.length > 0) {
      const tag = this.queue.first();
      if (tag !== CHUNK_TAG_MESSAGE && tag !== CHUNK_TAG_FINAL) {
        throw new CryptoError(
          `Invalid chunk tag: 0x${tag.toString(16)}`,
          CryptoErrorCode.INVALID_CIPHERTEXT,
        );
      }
      if (tag === CHUNK_TAG_FINAL) {
        if (this.queue.length > full) {
          throw new CryptoError(
            "Final chunk is longer than the chunk size",
            CryptoErrorCode.INVALID_CIPHERTEXT,
          );
        }
        break;
      }
      if (this.queue.length < full) break;
      out.push(this.open(this.queue.take(full)));
    }
    return out;
  }

  /** Ends the stream; returns the FINAL chunk's plaintext. */
  finish(): Uint8Array {
    if (this.queue.length === 0)
      throw new CryptoError(
        this.truncated.finalMissing,
        CryptoErrorCode.INVALID_CIPHERTEXT,
      );
    if (this.queue.first() !== CHUNK_TAG_FINAL) {
      throw new CryptoError(
        this.truncated.incomplete,
        CryptoErrorCode.INVALID_CIPHERTEXT,
      );
    }
    return this.open(this.queue.take(this.queue.length));
  }

  /** Opens a tag byte followed by a chunk's ciphertext. */
  private open(chunk: Uint8Array): Uint8Array {
    const nonce = this.chunkNonce(this.baseNonce, this.counter++, chunk[0]!);
    const body = chunk.subarray(1);
    if (this.key) return xchacha20poly1305(this.key, nonce).decrypt(body);
    const candidates =
      this.keys instanceof Uint8Array ? [this.keys] : this.keys;
    let firstError: unknown;
    for (const key of candidates) {
      try {
        const plaintext = xchacha20poly1305(key, nonce).decrypt(body);
        this.key = key;
        return plaintext;
      } catch (e) {
        firstError ??= e;
      }
    }
    throw firstError;
  }
}

/** Decrypts a whole chunk sequence with a {@link ChunkDecryptor}. */
export function decryptChunks(
  decryptor: ChunkDecryptor,
  body: Uint8Array,
): Uint8Array {
  const parts = decryptor.push(body);
  parts.push(decryptor.finish());
  return Uint8Array.from(concat(parts));
}

/**
 * Encrypt `plaintext` chunk by chunk with XChaCha20-Poly1305 into
 * `output`, starting at `offset`. Each chunk is its tag byte followed by
 * its ciphertext; the last chunk is tagged FINAL.
 */
export function encryptChunksInto(
  plaintext: Uint8Array,
  key: Uint8Array,
  baseNonce: Uint8Array,
  chunkSize: number,
  output: Uint8Array,
  offset: number,
  chunkNonce: ChunkNonce,
): void {
  const encryptor = new ChunkEncryptor(key, baseNonce, chunkSize, chunkNonce);
  for (const chunk of [...encryptor.push(plaintext), encryptor.finish()]) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
}
