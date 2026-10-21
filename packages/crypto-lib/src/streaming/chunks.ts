/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Chunk layout shared by the streaming AEAD constructions.
 */

import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";

/**
 * Throw unless `chunkSize` is a positive integer. Zero made encryption
 * loop forever, and NaN or a negative size produced a stream with no
 * chunks, silently dropping the plaintext.
 */
export function assertChunkSize(chunkSize: number): void {
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1) {
    throw new Error(`chunkSize must be a positive integer, got ${chunkSize}`);
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
  const total = chunkCount(plaintext.length, chunkSize);
  for (let i = 0; i < total; i++) {
    const isFinal = i === total - 1;
    const tag = isFinal ? CHUNK_TAG_FINAL : CHUNK_TAG_MESSAGE;
    const end = isFinal ? plaintext.length : (i + 1) * chunkSize;
    const chunk = plaintext.subarray(i * chunkSize, end);
    const nonce = chunkNonce(baseNonce, i, tag);
    const encrypted = xchacha20poly1305(key, nonce).encrypt(chunk);
    output[offset] = tag;
    output.set(encrypted, offset + 1);
    offset += 1 + encrypted.length;
  }
}
