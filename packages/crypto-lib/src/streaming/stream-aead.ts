/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Streaming AEAD — chunk-based authenticated encryption for large data.
 *
 * Uses the STREAM construction (inspired by libsodium's secretstream):
 * - Data is split into fixed-size chunks (default 64 KiB).
 * - Each chunk is encrypted with XChaCha20-Poly1305 using a derived
 *   per-chunk nonce (base nonce XOR chunk counter).
 * - The final chunk has a special tag to prevent truncation attacks.
 * - Header: base nonce (24 B) used to derive per-chunk nonces.
 *
 * Wire format:
 *   header (24 B) || chunk_0 (chunkSize + 17 B) || ... || chunk_n (remaining + 17 B)
 *
 * Each chunk: tag (1 B) || ciphertext || poly1305 tag (16 B)
 *   tag = 0x00 for intermediate chunks, 0x01 for the final chunk.
 */

import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";

/** XChaCha20 nonce length in bytes. */
const NONCE_LEN = 24;
/** Poly1305 authentication tag length in bytes. */
const TAG_LEN = 16;
/** Default chunk size for streaming encryption (64 KiB). */
const DEFAULT_CHUNK_SIZE = 64 * 1024; // 64 KiB
/** Chunk tag byte for intermediate (non-final) chunks. */
const CHUNK_TAG_MESSAGE = 0x00;
/** Chunk tag byte for the final chunk. */
const CHUNK_TAG_FINAL = 0x01;

/**
 * Derive a per-chunk nonce by XORing the base nonce with the chunk counter.
 * The counter is written into the last 8 bytes of the nonce (little-endian).
 */
function deriveChunkNonce(
  baseNonce: Uint8Array,
  counter: number,
  tag: number,
): Uint8Array {
  const nonce = new Uint8Array(baseNonce);
  // XOR counter into last 8 bytes (little-endian)
  const view = new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength);
  const low = counter & 0xffffffff;
  const high = (counter / 0x100000000) | 0;
  view.setUint32(
    nonce.length - 8,
    view.getUint32(nonce.length - 8) ^ low,
    true,
  );
  view.setUint32(
    nonce.length - 4,
    view.getUint32(nonce.length - 4) ^ high,
    true,
  );
  // XOR tag into first byte for domain separation
  nonce[0] = nonce[0]! ^ tag;
  return nonce;
}

/** Options for chunk-based streaming AEAD encryption. */
export interface StreamEncryptOptions {
  /** 256-bit key (32 bytes; hex string or Uint8Array). */
  key: string | Uint8Array;
  /** Plaintext to encrypt. */
  plaintext: Uint8Array;
  /** Chunk size in bytes (default: 65536 = 64 KiB). */
  chunkSize?: number;
}

/** Result of a streaming AEAD encryption operation. */
export interface StreamEncryptResult {
  /** Encrypted stream as a single Uint8Array. */
  ciphertext: Uint8Array;
  /** Algorithm identifier. */
  algorithm: "xchacha20-poly1305-stream";
}

/** Options for chunk-based streaming AEAD decryption. */
export interface StreamDecryptOptions {
  /** 256-bit key (32 bytes; hex string or Uint8Array). */
  key: string | Uint8Array;
  /** Ciphertext produced by streamEncrypt. */
  ciphertext: Uint8Array;
  /** Chunk size used during encryption (default: 65536 = 64 KiB). */
  chunkSize?: number;
}

/** Regex matching valid hexadecimal strings. */
const HEX_RE = /^[0-9a-fA-F]*$/;

/** Parse and validate a 256-bit key from hex string or Uint8Array. */
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

/**
 * Encrypt data in chunks using the STREAM construction.
 *
 * Each chunk is independently authenticated. The final chunk is tagged
 * to prevent truncation attacks.
 */
export function streamEncrypt(
  options: StreamEncryptOptions,
): StreamEncryptResult {
  const key = toKey(options.key);
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const plaintext = options.plaintext;

  const baseNonce = randomBytes(NONCE_LEN);

  // Calculate total output size
  const numFullChunks = Math.floor(plaintext.length / chunkSize);
  const lastChunkLen = plaintext.length - numFullChunks * chunkSize;
  const hasExtraChunk = lastChunkLen > 0 || plaintext.length === 0;
  const totalChunks = hasExtraChunk ? numFullChunks + 1 : numFullChunks;

  // Each chunk: tag (1B) + ciphertext + poly1305 tag (16B)
  let outputSize = NONCE_LEN; // header
  for (let i = 0; i < totalChunks; i++) {
    const ptLen =
      i < numFullChunks ? chunkSize : lastChunkLen > 0 ? lastChunkLen : 0;
    outputSize += 1 + ptLen + TAG_LEN; // tag byte + ciphertext + auth tag
  }

  const output = new Uint8Array(outputSize);
  output.set(baseNonce);
  let offset = NONCE_LEN;

  for (let i = 0; i < totalChunks; i++) {
    const isFinal = i === totalChunks - 1;
    const chunkTag = isFinal ? CHUNK_TAG_FINAL : CHUNK_TAG_MESSAGE;
    const start = i * chunkSize;
    const end = isFinal ? plaintext.length : start + chunkSize;
    const chunk = plaintext.subarray(start, end);

    const nonce = deriveChunkNonce(baseNonce, i, chunkTag);
    const cipher = xchacha20poly1305(key, nonce);
    const encrypted = cipher.encrypt(chunk);

    output[offset] = chunkTag;
    offset += 1;
    output.set(encrypted, offset);
    offset += encrypted.length;
  }

  return {
    ciphertext: output,
    algorithm: "xchacha20-poly1305-stream",
  };
}

/**
 * Decrypt a stream produced by {@link streamEncrypt}.
 *
 * Verifies each chunk's authentication tag and the final chunk marker.
 * @throws If any chunk fails authentication or the stream is truncated.
 */
export function streamDecrypt(options: StreamDecryptOptions): Uint8Array {
  const key = toKey(options.key);
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const ciphertext = options.ciphertext;

  if (ciphertext.length < NONCE_LEN + 1 + TAG_LEN) {
    throw new Error("Ciphertext too short — missing header or chunk data");
  }

  const baseNonce = ciphertext.subarray(0, NONCE_LEN);
  let offset = NONCE_LEN;

  const plaintextChunks: Uint8Array[] = [];
  let totalPtLen = 0;

  while (offset < ciphertext.length) {
    const chunkTag = ciphertext[offset]!;
    offset += 1;

    if (chunkTag !== CHUNK_TAG_MESSAGE && chunkTag !== CHUNK_TAG_FINAL) {
      throw new Error(`Invalid chunk tag: 0x${chunkTag.toString(16)}`);
    }

    const isFinal = chunkTag === CHUNK_TAG_FINAL;

    // Determine encrypted chunk length
    let encLen: number;
    if (isFinal) {
      encLen = ciphertext.length - offset;
    } else {
      encLen = chunkSize + TAG_LEN;
    }

    if (offset + encLen > ciphertext.length) {
      throw new Error("Ciphertext truncated — incomplete chunk");
    }

    const chunkIdx = plaintextChunks.length;
    const nonce = deriveChunkNonce(baseNonce, chunkIdx, chunkTag);
    const cipher = xchacha20poly1305(key, nonce);
    const decrypted = cipher.decrypt(
      ciphertext.subarray(offset, offset + encLen),
    );

    plaintextChunks.push(decrypted);
    totalPtLen += decrypted.length;
    offset += encLen;

    if (isFinal) break;
  }

  // Assemble plaintext
  const result = new Uint8Array(totalPtLen);
  let pos = 0;
  for (const chunk of plaintextChunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result;
}
