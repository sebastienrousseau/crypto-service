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
 * - Derived symmetric key: HKDF-SHA256(combined_shared_secret, salt = ephPub, info = "pq-stream-aead-v1")
 * - Chunks: STREAM construction using XChaCha20-Poly1305 with per-chunk derived nonces.
 * - Anti-truncation: The final chunk is tagged with 0x01.
 */

import { x25519 } from "@noble/curves/ed25519.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";

/** X25519 public key length in bytes. */
export const EPHEMERAL_LEN = 32;
/** ML-KEM-768 ciphertext length in bytes. */
export const ML_KEM_CT_LEN = 1088;
/** XChaCha20 nonce length in bytes. */
export const NONCE_LEN = 24;
/** Poly1305 authentication tag length in bytes. */
export const TAG_LEN = 16;
/** Total header length for post-quantum hybrid streaming AEAD. */
export const PQ_STREAM_HEADER_LEN = EPHEMERAL_LEN + ML_KEM_CT_LEN + NONCE_LEN;
/** Default chunk size for streaming encryption (64 KiB). */
export const DEFAULT_CHUNK_SIZE = 64 * 1024;
/** Chunk tag byte for intermediate chunks. */
export const CHUNK_TAG_MESSAGE = 0x00;
/** Chunk tag byte for the final chunk. */
export const CHUNK_TAG_FINAL = 0x01;

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
  chunkSize?: number;
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
  chunkSize?: number;
}

/** Derives symmetric encryption key from combined X25519 and ML-KEM shared secrets. */
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

/** Encapsulates post-quantum hybrid key material for encryption. */
function encapsulateKeyMaterial(
  recipX25519Pub: Uint8Array,
  recipMlKemPub: Uint8Array,
): { ephPub: Uint8Array; mlKemCt: Uint8Array; key: Uint8Array } {
  const ephPriv = randomBytes(32);
  const ephPub = x25519.getPublicKey(ephPriv);
  const x25519Shared = x25519.getSharedSecret(ephPriv, recipX25519Pub);

  const { cipherText: mlKemCt, sharedSecret: mlKemShared } =
    ml_kem768.encapsulate(recipMlKemPub);

  const key = deriveSharedKey(x25519Shared, mlKemShared, ephPub);
  return { ephPub, mlKemCt, key };
}

/** Decapsulates post-quantum hybrid key material for decryption. */
function decapsulateKeyMaterial(
  recipX25519Sec: Uint8Array,
  recipMlKemSec: Uint8Array,
  ephPub: Uint8Array,
  mlKemCt: Uint8Array,
): Uint8Array {
  const mlKemShared = ml_kem768.decapsulate(mlKemCt, recipMlKemSec);
  const x25519Shared = x25519.getSharedSecret(recipX25519Sec, ephPub);
  return deriveSharedKey(x25519Shared, mlKemShared, ephPub);
}

/** Computes chunk count and total output size for encrypted stream. */
function computeStreamOutputSize(ptLen: number, chunkSize: number): number {
  const numFullChunks = Math.floor(ptLen / chunkSize);
  const lastChunkLen = ptLen - numFullChunks * chunkSize;
  const hasExtraChunk = lastChunkLen > 0 || ptLen === 0;
  const totalChunks = hasExtraChunk ? numFullChunks + 1 : numFullChunks;

  let totalSize = PQ_STREAM_HEADER_LEN;
  for (let i = 0; i < totalChunks; i++) {
    const len =
      i < numFullChunks ? chunkSize : lastChunkLen > 0 ? lastChunkLen : 0;
    totalSize += 1 + len + TAG_LEN;
  }
  return totalSize;
}

/** Encrypts plaintext chunks into the output buffer. */
function encryptChunks(
  plaintext: Uint8Array,
  key: Uint8Array,
  baseNonce: Uint8Array,
  chunkSize: number,
  output: Uint8Array,
): void {
  const numFullChunks = Math.floor(plaintext.length / chunkSize);
  const hasExtra = plaintext.length % chunkSize > 0 || plaintext.length === 0;
  const totalChunks = hasExtra ? numFullChunks + 1 : numFullChunks;

  let offset = PQ_STREAM_HEADER_LEN;
  for (let i = 0; i < totalChunks; i++) {
    const isFinal = i === totalChunks - 1;
    const chunkTag = isFinal ? CHUNK_TAG_FINAL : CHUNK_TAG_MESSAGE;
    const start = i * chunkSize;
    const end = isFinal ? plaintext.length : start + chunkSize;
    const chunk = plaintext.subarray(start, end);

    const nonce = derivePqChunkNonce(baseNonce, i, chunkTag);
    const cipher = xchacha20poly1305(key, nonce);
    const encrypted = cipher.encrypt(chunk);

    output[offset] = chunkTag;
    offset += 1;
    output.set(encrypted, offset);
    offset += encrypted.length;
  }
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
  const plaintext = options.plaintext;

  const { ephPub, mlKemCt, key } = encapsulateKeyMaterial(
    recipX25519Pub,
    recipMlKemPub,
  );
  const baseNonce = randomBytes(NONCE_LEN);

  const totalSize = computeStreamOutputSize(plaintext.length, chunkSize);
  const output = new Uint8Array(totalSize);

  output.set(ephPub, 0);
  output.set(mlKemCt, EPHEMERAL_LEN);
  output.set(baseNonce, EPHEMERAL_LEN + ML_KEM_CT_LEN);

  encryptChunks(plaintext, key, baseNonce, chunkSize, output);

  return {
    ciphertext: output,
    algorithm: "x25519-ml-kem-768-xchacha20-poly1305-stream",
  };
}

/** Validates chunk header and returns encrypted chunk length. */
function readPqChunkHeader(
  ciphertext: Uint8Array,
  offset: number,
  chunkSize: number,
): { chunkTag: number; isFinal: boolean; encLen: number } {
  const chunkTag = ciphertext[offset] as number;
  if (chunkTag !== CHUNK_TAG_MESSAGE && chunkTag !== CHUNK_TAG_FINAL) {
    throw new Error(`Invalid chunk tag: 0x${chunkTag.toString(16)}`);
  }
  const isFinal = chunkTag === CHUNK_TAG_FINAL;
  const start = offset + 1;
  const encLen = isFinal ? ciphertext.length - start : chunkSize + TAG_LEN;
  if (start + encLen > ciphertext.length) {
    throw new Error("Ciphertext truncated — incomplete chunk");
  }
  return { chunkTag, isFinal, encLen };
}

/** Decrypts chunks from a ciphertext buffer. */
function decryptChunks(
  ciphertext: Uint8Array,
  key: Uint8Array,
  baseNonce: Uint8Array,
  chunkSize: number,
): Uint8Array {
  let offset = PQ_STREAM_HEADER_LEN;
  const chunks: Uint8Array[] = [];
  let totalPtLen = 0;
  let sawFinal = false;

  while (offset < ciphertext.length) {
    const { chunkTag, isFinal, encLen } = readPqChunkHeader(
      ciphertext,
      offset,
      chunkSize,
    );
    offset += 1;

    const chunkIdx = chunks.length;
    const nonce = derivePqChunkNonce(baseNonce, chunkIdx, chunkTag);
    const cipher = xchacha20poly1305(key, nonce);
    const decrypted = cipher.decrypt(
      ciphertext.subarray(offset, offset + encLen),
    );

    chunks.push(decrypted);
    totalPtLen += decrypted.length;
    offset += encLen;

    if (isFinal) {
      sawFinal = true;
      break;
    }
  }

  if (!sawFinal) {
    throw new Error("Ciphertext truncated — final chunk missing");
  }

  const result = new Uint8Array(totalPtLen);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
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
  const ciphertext = options.ciphertext;

  if (ciphertext.length < PQ_STREAM_HEADER_LEN + 1 + TAG_LEN) {
    throw new Error("Ciphertext too short — missing header or chunk data");
  }

  const ephPub = ciphertext.subarray(0, EPHEMERAL_LEN);
  const mlKemCt = ciphertext.subarray(
    EPHEMERAL_LEN,
    EPHEMERAL_LEN + ML_KEM_CT_LEN,
  );
  const baseNonce = ciphertext.subarray(
    EPHEMERAL_LEN + ML_KEM_CT_LEN,
    PQ_STREAM_HEADER_LEN,
  );

  const key = decapsulateKeyMaterial(
    recipX25519Sec,
    recipMlKemSec,
    ephPub,
    mlKemCt,
  );

  return decryptChunks(ciphertext, key, baseNonce, chunkSize);
}
