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
import {
  CHUNK_TAG_FINAL,
  CHUNK_TAG_MESSAGE,
  TAG_LEN,
  assertChunkSize,
  encryptChunksInto,
  streamSize,
} from "./chunks";

/** XChaCha20 nonce length in bytes. */
const NONCE_LEN = 24;
/** Default chunk size for streaming encryption (64 KiB). */
const DEFAULT_CHUNK_SIZE = 64 * 1024; // 64 KiB

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
  assertChunkSize(chunkSize);
  const plaintext = options.plaintext;

  const baseNonce = randomBytes(NONCE_LEN);
  const output = new Uint8Array(
    streamSize(NONCE_LEN, plaintext.length, chunkSize),
  );
  output.set(baseNonce);
  encryptChunksInto(
    plaintext,
    key,
    baseNonce,
    chunkSize,
    output,
    NONCE_LEN,
    deriveChunkNonce,
  );

  return {
    ciphertext: output,
    algorithm: "xchacha20-poly1305-stream",
  };
}

/** Tag byte and encrypted length of the chunk that starts at `offset`. */
interface ChunkHeader {
  chunkTag: number;
  isFinal: boolean;
  encLen: number;
}

/**
 * Read and validate the chunk header at `offset`: the tag byte must be a
 * MESSAGE or FINAL marker, and the chunk must fit in the ciphertext.
 */
function readChunkHeader(
  ciphertext: Uint8Array,
  offset: number,
  chunkSize: number,
): ChunkHeader {
  const chunkTag = ciphertext[offset]!;
  if (chunkTag !== CHUNK_TAG_MESSAGE && chunkTag !== CHUNK_TAG_FINAL) {
    throw new Error(`Invalid chunk tag: 0x${chunkTag.toString(16)}`);
  }
  const isFinal = chunkTag === CHUNK_TAG_FINAL;
  const start = offset + 1;
  // The FINAL chunk runs to the end; every other chunk is full-sized.
  const encLen = isFinal ? ciphertext.length - start : chunkSize + TAG_LEN;
  if (start + encLen > ciphertext.length) {
    throw new Error("Ciphertext truncated — incomplete chunk");
  }
  return { chunkTag, isFinal, encLen };
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
  assertChunkSize(chunkSize);
  const ciphertext = options.ciphertext;

  if (ciphertext.length < NONCE_LEN + 1 + TAG_LEN) {
    throw new Error("Ciphertext too short — missing header or chunk data");
  }

  const baseNonce = ciphertext.subarray(0, NONCE_LEN);
  let offset = NONCE_LEN;

  const plaintextChunks: Uint8Array[] = [];
  let totalPtLen = 0;
  let sawFinal = false;

  while (offset < ciphertext.length) {
    const { chunkTag, isFinal, encLen } = readChunkHeader(
      ciphertext,
      offset,
      chunkSize,
    );
    offset += 1;

    const chunkIdx = plaintextChunks.length;
    const nonce = deriveChunkNonce(baseNonce, chunkIdx, chunkTag);
    const cipher = xchacha20poly1305(key, nonce);
    const decrypted = cipher.decrypt(
      ciphertext.subarray(offset, offset + encLen),
    );

    plaintextChunks.push(decrypted);
    totalPtLen += decrypted.length;
    offset += encLen;

    if (isFinal) {
      sawFinal = true;
      break;
    }
  }

  // Without the FINAL chunk, an attacker could drop trailing chunks and
  // the remaining prefix would still authenticate chunk by chunk.
  if (!sawFinal) {
    throw new Error("Ciphertext truncated — final chunk missing");
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
