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

import { randomBytes } from "@noble/ciphers/utils.js";
import {
  ChunkDecryptor,
  ChunkEncryptor,
  TAG_LEN,
  assertChunkSize,
  decryptChunks,
  encryptChunksInto,
  streamSize,
} from "./chunks";
import { CryptoError, CryptoErrorCode } from "../errors";
import { decodeHex, isHex } from "../encoding";

/** XChaCha20 nonce length in bytes, which is also the header length. */
const NONCE_LEN = 24;
/** Length of the stream header: the base nonce. */
export const AEAD_STREAM_HEADER_LEN = NONCE_LEN;
/** Default chunk size for streaming encryption (64 KiB). */
export const DEFAULT_CHUNK_SIZE = 64 * 1024; // 64 KiB

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

/** Parse and validate a 256-bit key from hex string or Uint8Array. */
export function toKey(key: string | Uint8Array): Uint8Array {
  if (key instanceof Uint8Array) {
    if (key.length !== 32) {
      throw new CryptoError(
        `Key must be 32 bytes, got ${key.length}`,
        CryptoErrorCode.INVALID_KEY,
      );
    }
    return key;
  }
  if (!isHex(key))
    throw new CryptoError("Invalid hex key", CryptoErrorCode.INVALID_HEX);
  const buf = decodeHex(key);
  if (buf.length !== 32) {
    throw new CryptoError(
      `Key must be 32 bytes (256 bits), got ${buf.length}`,
      CryptoErrorCode.INVALID_KEY,
    );
  }
  return buf;
}

/**
 * Starts a stream for `key`: its header (a fresh base nonce) and the
 * encryptor for its chunks, for callers that encrypt as data arrives.
 */
export function aeadStreamSender(
  key: Uint8Array,
  chunkSize: number,
): { header: Uint8Array; encryptor: ChunkEncryptor } {
  const baseNonce = randomBytes(NONCE_LEN);
  return {
    header: baseNonce,
    encryptor: new ChunkEncryptor(key, baseNonce, chunkSize, deriveChunkNonce),
  };
}

/** The decryptor for the chunks that follow a stream's `header`. */
export function aeadStreamReceiver(
  key: Uint8Array,
  header: Uint8Array,
  chunkSize: number,
): ChunkDecryptor {
  return new ChunkDecryptor(key, header, chunkSize, deriveChunkNonce);
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
    throw new CryptoError(
      "Ciphertext too short — missing header or chunk data",
      CryptoErrorCode.INVALID_CIPHERTEXT,
    );
  }

  const baseNonce = ciphertext.subarray(0, NONCE_LEN);
  // Without the FINAL chunk, an attacker could drop trailing chunks and
  // the remaining prefix would still authenticate chunk by chunk; the
  // decryptor refuses a stream that ends without one.
  return decryptChunks(
    new ChunkDecryptor(key, baseNonce, chunkSize, deriveChunkNonce),
    ciphertext.subarray(NONCE_LEN),
  );
}
