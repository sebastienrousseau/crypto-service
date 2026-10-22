/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Post-quantum hybrid streaming AEAD encryption (X25519 + ML-KEM-768 + XChaCha20-Poly1305).
 *
 * Implements chunk-based authenticated encryption for large data streams using
 * hybrid post-quantum key encapsulation:
 * - Header: ephemeral X25519 public key (32 B) || ML-KEM-768 ciphertext (1088 B) || base nonce (24 B)
 * - Derived symmetric key: the library's v2 hybrid KEM secret (modern/hybrid-combiner.ts),
 *   HKDF-SHA256 with info "crypto-service/pq-stream/v2". Streams written before
 *   used HKDF-SHA256(combined_shared_secret, salt = ephPub, info = "pq-stream-aead-v1");
 *   they still decrypt.
 * - Chunks: STREAM construction using XChaCha20-Poly1305 with per-chunk derived nonces.
 * - Anti-truncation: The final chunk is tagged with 0x01.
 */

import { hybridReceiveKeys, hybridSend } from "../modern/hybrid-combiner";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import {
  ChunkDecryptor,
  ChunkEncryptor,
  TAG_LEN,
  assertChunkSize,
  decryptChunks,
} from "./chunks";

// The chunk tags and Poly1305 tag length are shared with the other
// streams; re-exported for existing importers of this module.
export { TAG_LEN };

/** X25519 public key length in bytes. */
export const EPHEMERAL_LEN = 32;
/** ML-KEM-768 ciphertext length in bytes. */
export const ML_KEM_CT_LEN = 1088;
/** XChaCha20 nonce length in bytes. */
export const NONCE_LEN = 24;
/** Total header length for post-quantum hybrid streaming AEAD. */
export const PQ_STREAM_HEADER_LEN = EPHEMERAL_LEN + ML_KEM_CT_LEN + NONCE_LEN;
/** Default chunk size for streaming encryption (64 KiB). */
export const DEFAULT_CHUNK_SIZE = 64 * 1024;

const HEX_RE = /^[0-9a-fA-F]*$/;

/** Helper to parse hex or Uint8Array bytes and validate length. */
export function toBytes(
  data: string | Uint8Array,
  expectedLen?: number,
  name = "Data",
): Uint8Array {
  let buf: Uint8Array;
  if (typeof data === "string") {
    if (!HEX_RE.test(data)) throw new Error(`Invalid hex string for ${name}`);
    buf = Buffer.from(data, "hex");
  } else {
    buf = new Uint8Array(data);
  }
  if (expectedLen !== undefined && buf.length !== expectedLen) {
    throw new Error(`${name} must be ${expectedLen} bytes, got ${buf.length}`);
  }
  return buf;
}

/** Derive a per-chunk nonce by XORing baseNonce with counter and tag. */
export function derivePqChunkNonce(
  baseNonce: Uint8Array,
  counter: number,
  tag: number,
): Uint8Array {
  const nonce = new Uint8Array(baseNonce);
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
  nonce[0] = (nonce[0] as number) ^ tag;
  return nonce;
}

/** Options for post-quantum streaming AEAD encryption. */
export interface StreamPqEncryptOptions {
  recipientX25519Public: string | Uint8Array;
  recipientMlKemPublic: string | Uint8Array;
  plaintext: Uint8Array;
  chunkSize?: number | undefined;
}

/** Result of post-quantum streaming AEAD encryption. */
export interface StreamPqEncryptResult {
  ciphertext: Uint8Array;
  algorithm: "x25519-ml-kem-768-xchacha20-poly1305-stream";
}

/** Options for post-quantum streaming AEAD decryption. */
export interface StreamPqDecryptOptions {
  recipientX25519Secret: string | Uint8Array;
  recipientMlKemSecret: string | Uint8Array;
  ciphertext: Uint8Array;
  chunkSize?: number | undefined;
}

/**
 * The key streams written before the v2 hybrid KEM used: HKDF over the
 * two shared secrets, bound only to the ephemeral key.
 */
function deriveSharedKey(
  x25519Shared: Uint8Array,
  mlKemShared: Uint8Array,
  ephPub: Uint8Array,
): Uint8Array {
  const combined = new Uint8Array(x25519Shared.length + mlKemShared.length);
  combined.set(x25519Shared);
  combined.set(mlKemShared, x25519Shared.length);
  return hkdf(
    sha256,
    combined,
    ephPub,
    new TextEncoder().encode("pq-stream-aead-v1"),
    32,
  );
}

/**
 * Starts a stream to a recipient: its header (ephemeral X25519 key,
 * ML-KEM-768 ciphertext, base nonce) and the encryptor for its chunks.
 */
export function pqStreamSender(
  recipX25519Pub: Uint8Array,
  recipMlKemPub: Uint8Array,
  chunkSize: number,
): { header: Uint8Array; encryptor: ChunkEncryptor } {
  const { ephPub, mlKemCt, key } = hybridSend(
    recipX25519Pub,
    recipMlKemPub,
    "pq-stream",
  );
  const baseNonce = randomBytes(NONCE_LEN);
  const header = new Uint8Array(PQ_STREAM_HEADER_LEN);
  header.set(ephPub, 0);
  header.set(mlKemCt, EPHEMERAL_LEN);
  header.set(baseNonce, EPHEMERAL_LEN + ML_KEM_CT_LEN);
  const encryptor = new ChunkEncryptor(
    key,
    baseNonce,
    chunkSize,
    derivePqChunkNonce,
  );
  return { header, encryptor };
}

/**
 * The decryptor for a stream's chunks, from its header and the
 * recipient's secret keys.
 */
export function pqStreamReceiver(
  recipX25519Sec: Uint8Array,
  recipMlKemSec: Uint8Array,
  header: Uint8Array,
  chunkSize: number,
): ChunkDecryptor {
  const ephPub = header.subarray(0, EPHEMERAL_LEN);
  const mlKemCt = header.subarray(EPHEMERAL_LEN, EPHEMERAL_LEN + ML_KEM_CT_LEN);
  const baseNonce = header.subarray(
    EPHEMERAL_LEN + ML_KEM_CT_LEN,
    PQ_STREAM_HEADER_LEN,
  );
  // The v2 key, then the key streams written before it used.
  const keys = hybridReceiveKeys(
    recipX25519Sec,
    recipMlKemSec,
    ephPub,
    mlKemCt,
    "pq-stream",
    (x25519Shared, mlKemShared) =>
      deriveSharedKey(x25519Shared, mlKemShared, ephPub),
  );
  return new ChunkDecryptor(keys, baseNonce, chunkSize, derivePqChunkNonce);
}

/**
 * Encrypt data using hybrid post-quantum STREAM construction.
 *
 * @param options - Encryption parameters including recipient public keys.
 * @returns Resulting ciphertext with algorithm identifier.
 */
export function streamPqEncrypt(
  options: StreamPqEncryptOptions,
): StreamPqEncryptResult {
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
  const plaintext = options.plaintext;

  const { header, encryptor } = pqStreamSender(
    recipX25519Pub,
    recipMlKemPub,
    chunkSize,
  );
  const output = Uint8Array.from(
    Buffer.concat([header, ...encryptor.push(plaintext), encryptor.finish()]),
  );

  return {
    ciphertext: output,
    algorithm: "x25519-ml-kem-768-xchacha20-poly1305-stream",
  };
}

/**
 * Decrypts a stream produced by {@link streamPqEncrypt}.
 *
 * @param options - Decryption parameters including recipient secret keys.
 * @returns Plaintext bytes.
 */
export function streamPqDecrypt(options: StreamPqDecryptOptions): Uint8Array {
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
  const ciphertext = options.ciphertext;

  if (ciphertext.length < PQ_STREAM_HEADER_LEN + 1 + TAG_LEN) {
    throw new Error("Ciphertext too short — missing header or chunk data");
  }

  return decryptChunks(
    pqStreamReceiver(
      recipX25519Sec,
      recipMlKemSec,
      ciphertext.subarray(0, PQ_STREAM_HEADER_LEN),
      chunkSize,
    ),
    ciphertext.subarray(PQ_STREAM_HEADER_LEN),
  );
}
