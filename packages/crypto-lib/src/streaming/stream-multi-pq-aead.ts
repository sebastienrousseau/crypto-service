/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Multi-recipient post-quantum hybrid streaming AEAD (X25519 + ML-KEM-768 + XChaCha20-Poly1305).
 *
 * Implements envelope-wrapped chunk-based authenticated encryption for multiple recipients:
 * - Content Encryption Key (CEK): Random 32-byte 256-bit symmetric key per stream.
 * - Per-recipient slot: Ephemeral X25519 (32 B) + ML-KEM-768 (1088 B) encapsulation deriving
 *   hybrid KEK to wrap the CEK with authenticated recipient binding.
 * - Chunks: STREAM construction using XChaCha20-Poly1305 with per-chunk derived nonces.
 * - Anti-truncation: The final chunk is tagged with 0x01.
 */

import { x25519 } from "@noble/curves/ed25519.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { wipeMemory } from "../utils";
import {
  EPHEMERAL_LEN,
  ML_KEM_CT_LEN,
  NONCE_LEN,
  TAG_LEN,
  DEFAULT_CHUNK_SIZE,
  CHUNK_TAG_MESSAGE,
  CHUNK_TAG_FINAL,
  derivePqChunkNonce,
  toBytes,
} from "./stream-pq-aead";

/** Magic bytes identifying multi-recipient post-quantum stream format ("MSPQ"). */
export const MULTI_PQ_STREAM_MAGIC = new Uint8Array([0x4d, 0x53, 0x50, 0x51]);

/** Format version byte. */
export const MULTI_PQ_STREAM_VERSION = 0x01;

/** Fixed header prefix length: Magic (4) + Version (1) + ChunkSize (4) + BaseNonce (24) + Count (2). */
export const MULTI_PQ_PREFIX_LEN = 35;

/** CEK length in bytes (256 bits). */
export const CEK_LEN = 32;

/** Wrapped CEK length: CEK (32) + Poly1305 Tag (16). */
export const WRAPPED_CEK_LEN = CEK_LEN + TAG_LEN;

/** Fixed per-slot byte overhead: IdLen (1) + EphPub (32) + MlKemCt (1088) + SlotNonce (24) + WrappedCek (48). */
export const SLOT_FIXED_OVERHEAD =
  1 + EPHEMERAL_LEN + ML_KEM_CT_LEN + NONCE_LEN + WRAPPED_CEK_LEN;

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const KEK_INFO = TEXT_ENCODER.encode("multi-pq-stream-kek-v1");

/** Recipient public key specification for multi-recipient encryption. */
export interface MultiPqRecipient {
  /** Unique recipient identifier (1 to 255 UTF-8 bytes). */
  recipientId: string;
  /** Recipient X25519 public key (32 bytes, hex string or Uint8Array). */
  recipientX25519Public: string | Uint8Array;
  /** Recipient ML-KEM-768 public key (1184 bytes, hex string or Uint8Array). */
  recipientMlKemPublic: string | Uint8Array;
}

/** Options for multi-recipient post-quantum streaming AEAD encryption. */
export interface StreamMultiPqEncryptOptions {
  /** List of recipients who will be able to decrypt the stream. */
  recipients: MultiPqRecipient[];
  /** Plaintext byte payload to encrypt. */
  plaintext: Uint8Array;
  /** Stream chunk size in bytes (optional, defaults to 64 KiB). */
  chunkSize?: number | undefined;
}

/** Result of multi-recipient post-quantum streaming AEAD encryption. */
export interface StreamMultiPqEncryptResult {
  /** Complete stream ciphertext including header, recipient slots, and encrypted chunks. */
  ciphertext: Uint8Array;
  /** Cryptographic algorithm identifier. */
  algorithm: "multi-x25519-ml-kem-768-xchacha20-poly1305-stream";
  /** Number of recipient key slots encapsulated in the header. */
  recipientCount: number;
}

/** Options for multi-recipient post-quantum streaming AEAD decryption. */
export interface StreamMultiPqDecryptOptions {
  /** Optional recipient identifier to match slot directly without trial decapsulation. */
  recipientId?: string | undefined;
  /** Recipient X25519 secret key (32 bytes, hex string or Uint8Array). */
  recipientX25519Secret: string | Uint8Array;
  /** Recipient ML-KEM-768 secret key (2400 bytes, hex string or Uint8Array). */
  recipientMlKemSecret: string | Uint8Array;
  /** Ciphertext byte buffer to decrypt. */
  ciphertext: Uint8Array;
  /** Optional chunk size override (defaults to the chunk size stored in the stream header). */
  chunkSize?: number | undefined;
}

/** Result of multi-recipient post-quantum streaming AEAD decryption. */
export interface StreamMultiPqDecryptResult {
  /** Decrypted plaintext byte buffer. */
  plaintext: Uint8Array;
  /** Identifier of the recipient slot that successfully decrypted the stream. */
  recipientId: string;
}

/** Internal parsed recipient slot header. */
interface ParsedSlot {
  recipientId: string;
  recipientIdBytes: Uint8Array;
  slotIndex: number;
  ephPub: Uint8Array;
  mlKemCt: Uint8Array;
  slotNonce: Uint8Array;
  wrappedCek: Uint8Array;
}

/** Validates recipient definition and encodes recipient ID to UTF-8 bytes. */
function validateRecipient(r: MultiPqRecipient): {
  idBytes: Uint8Array;
  x25519Pub: Uint8Array;
  mlKemPub: Uint8Array;
} {
  if (!r.recipientId || typeof r.recipientId !== "string") {
    throw new Error("Recipient ID must be a non-empty string");
  }
  const idBytes = TEXT_ENCODER.encode(r.recipientId);
  if (idBytes.length === 0 || idBytes.length > 255) {
    throw new Error("Recipient ID must be between 1 and 255 UTF-8 bytes");
  }
  const x25519Pub = toBytes(
    r.recipientX25519Public,
    32,
    "recipientX25519Public",
  );
  const mlKemPub = toBytes(
    r.recipientMlKemPublic,
    1184,
    "recipientMlKemPublic",
  );
  return { idBytes, x25519Pub, mlKemPub };
}

/** Derives hybrid KEK and wraps CEK for a single recipient slot. */
function createSlot(
  cek: Uint8Array,
  slotIndex: number,
  r: MultiPqRecipient,
): Uint8Array {
  const { idBytes, x25519Pub, mlKemPub } = validateRecipient(r);
  const ephPriv = randomBytes(32);
  const ephPub = x25519.getPublicKey(ephPriv);
  const x25519Shared = x25519.getSharedSecret(ephPriv, x25519Pub);
  const { cipherText: mlKemCt, sharedSecret: mlKemShared } =
    ml_kem768.encapsulate(mlKemPub);

  const combined = new Uint8Array(64);
  combined.set(x25519Shared, 0);
  combined.set(mlKemShared, 32);

  const kek = hkdf(sha256, combined, ephPub, KEK_INFO, 32);
  const slotNonce = randomBytes(NONCE_LEN);
  const aad = buildSlotAad(idBytes, slotIndex);
  const wrappedCek = xchacha20poly1305(kek, slotNonce, aad).encrypt(cek);

  wipeMemory(ephPriv);
  wipeMemory(x25519Shared);
  wipeMemory(mlKemShared);
  wipeMemory(combined);
  wipeMemory(kek);

  return serializeSlot(idBytes, ephPub, mlKemCt, slotNonce, wrappedCek);
}

/** Builds authenticated additional data binding recipient ID and slot index. */
function buildSlotAad(idBytes: Uint8Array, slotIndex: number): Uint8Array {
  const aad = new Uint8Array(idBytes.length + 4);
  aad.set(idBytes, 0);
  const view = new DataView(aad.buffer, aad.byteOffset, aad.byteLength);
  view.setUint32(idBytes.length, slotIndex, false);
  return aad;
}

/** Serializes a recipient slot into binary representation. */
function serializeSlot(
  idBytes: Uint8Array,
  ephPub: Uint8Array,
  mlKemCt: Uint8Array,
  slotNonce: Uint8Array,
  wrappedCek: Uint8Array,
): Uint8Array {
  const slotLen = SLOT_FIXED_OVERHEAD + idBytes.length;
  const out = new Uint8Array(slotLen);
  out[0] = idBytes.length;
  let pos = 1;
  out.set(idBytes, pos);
  pos += idBytes.length;
  out.set(ephPub, pos);
  pos += EPHEMERAL_LEN;
  out.set(mlKemCt, pos);
  pos += ML_KEM_CT_LEN;
  out.set(slotNonce, pos);
  pos += NONCE_LEN;
  out.set(wrappedCek, pos);
  return out;
}

/** Computes total output size for encrypted multi-recipient stream. */
function computeMultiStreamOutputSize(
  headerLen: number,
  ptLen: number,
  chunkSize: number,
): number {
  const numFullChunks = Math.floor(ptLen / chunkSize);
  const lastChunkLen = ptLen - numFullChunks * chunkSize;
  const hasExtra = lastChunkLen > 0 || ptLen === 0;
  const totalChunks = hasExtra ? numFullChunks + 1 : numFullChunks;

  let totalSize = headerLen;
  for (let i = 0; i < totalChunks; i++) {
    const len =
      i < numFullChunks ? chunkSize : lastChunkLen > 0 ? lastChunkLen : 0;
    totalSize += 1 + len + TAG_LEN;
  }
  return totalSize;
}

/** Encrypts plaintext chunks into the stream output buffer. */
function encryptStreamChunks(
  plaintext: Uint8Array,
  cek: Uint8Array,
  baseNonce: Uint8Array,
  chunkSize: number,
  output: Uint8Array,
  headerLen: number,
): void {
  const numFullChunks = Math.floor(plaintext.length / chunkSize);
  const hasExtra = plaintext.length % chunkSize > 0 || plaintext.length === 0;
  const totalChunks = hasExtra ? numFullChunks + 1 : numFullChunks;

  let offset = headerLen;
  for (let i = 0; i < totalChunks; i++) {
    const isFinal = i === totalChunks - 1;
    const chunkTag = isFinal ? CHUNK_TAG_FINAL : CHUNK_TAG_MESSAGE;
    const start = i * chunkSize;
    const end = isFinal ? plaintext.length : start + chunkSize;
    const chunk = plaintext.subarray(start, end);

    const nonce = derivePqChunkNonce(baseNonce, i, chunkTag);
    const cipher = xchacha20poly1305(cek, nonce);
    const encrypted = cipher.encrypt(chunk);

    output[offset] = chunkTag;
    offset += 1;
    output.set(encrypted, offset);
    offset += encrypted.length;
  }
}

/** Writes header prefix fields: magic, version, chunkSize, baseNonce, count. */
function writeHeaderPrefix(
  out: Uint8Array,
  chunkSize: number,
  baseNonce: Uint8Array,
  count: number,
): void {
  out.set(MULTI_PQ_STREAM_MAGIC, 0);
  out[4] = MULTI_PQ_STREAM_VERSION;
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setUint32(5, chunkSize, false);
  out.set(baseNonce, 9);
  view.setUint16(33, count, false);
}

/**
 * Encrypt data for multiple recipients using hybrid post-quantum STREAM AEAD.
 *
 * @param options - Encryption parameters including recipient public keys and plaintext.
 * @returns Resulting ciphertext and metadata.
 */
export function streamMultiPqEncrypt(
  options: StreamMultiPqEncryptOptions,
): StreamMultiPqEncryptResult {
  const recipients = options.recipients;
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("At least one recipient is required");
  }
  if (recipients.length > 1000) {
    throw new Error("Recipient count exceeds maximum limit of 1000");
  }
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  if (chunkSize < 1024 || chunkSize > 16 * 1024 * 1024) {
    throw new Error("Chunk size must be between 1024 and 16777216 bytes");
  }

  const cek = randomBytes(CEK_LEN);
  const baseNonce = randomBytes(NONCE_LEN);

  const serializedSlots: Uint8Array[] = [];
  let slotsTotalLen = 0;
  for (let i = 0; i < recipients.length; i++) {
    const slotBytes = createSlot(cek, i, recipients[i] as MultiPqRecipient);
    serializedSlots.push(slotBytes);
    slotsTotalLen += slotBytes.length;
  }

  const headerLen = MULTI_PQ_PREFIX_LEN + slotsTotalLen;
  const totalSize = computeMultiStreamOutputSize(
    headerLen,
    options.plaintext.length,
    chunkSize,
  );
  const output = new Uint8Array(totalSize);

  writeHeaderPrefix(output, chunkSize, baseNonce, recipients.length);
  let slotOffset = MULTI_PQ_PREFIX_LEN;
  for (const s of serializedSlots) {
    output.set(s, slotOffset);
    slotOffset += s.length;
  }

  encryptStreamChunks(
    options.plaintext,
    cek,
    baseNonce,
    chunkSize,
    output,
    headerLen,
  );
  wipeMemory(cek);

  return {
    ciphertext: output,
    algorithm: "multi-x25519-ml-kem-768-xchacha20-poly1305-stream",
    recipientCount: recipients.length,
  };
}

/** Validates stream header prefix and returns header parameters. */
function parseHeaderPrefix(ciphertext: Uint8Array): {
  chunkSize: number;
  baseNonce: Uint8Array;
  recipientCount: number;
} {
  if (ciphertext.length < MULTI_PQ_PREFIX_LEN) {
    throw new Error("Ciphertext too short: missing header prefix");
  }
  for (let i = 0; i < 4; i++) {
    if (ciphertext[i] !== MULTI_PQ_STREAM_MAGIC[i]) {
      throw new Error("Invalid multi-recipient post-quantum stream magic");
    }
  }
  if (ciphertext[4] !== MULTI_PQ_STREAM_VERSION) {
    throw new Error(
      `Unsupported multi-recipient post-quantum stream version: ${ciphertext[4]}`,
    );
  }
  const view = new DataView(
    ciphertext.buffer,
    ciphertext.byteOffset,
    ciphertext.byteLength,
  );
  const chunkSize = view.getUint32(5, false);
  if (chunkSize < 1024 || chunkSize > 16 * 1024 * 1024) {
    throw new Error(`Invalid stream header chunk size: ${chunkSize}`);
  }
  const baseNonce = ciphertext.subarray(9, 33);
  const recipientCount = view.getUint16(33, false);
  if (recipientCount < 1) {
    throw new Error("Invalid stream header: zero recipients");
  }
  return { chunkSize, baseNonce, recipientCount };
}

/** Parses all recipient slots from ciphertext starting at offset 35. */
function parseSlots(
  ciphertext: Uint8Array,
  recipientCount: number,
): { slots: ParsedSlot[]; headerEndOffset: number } {
  let offset = MULTI_PQ_PREFIX_LEN;
  const slots: ParsedSlot[] = [];

  for (let i = 0; i < recipientCount; i++) {
    if (offset >= ciphertext.length) {
      throw new Error("Ciphertext truncated: incomplete slot table");
    }
    const idLen = ciphertext[offset] as number;
    const slotTotalLen = SLOT_FIXED_OVERHEAD + idLen;
    if (offset + slotTotalLen > ciphertext.length) {
      throw new Error("Ciphertext truncated: incomplete recipient slot");
    }
    const idStart = offset + 1;
    const recipientIdBytes = ciphertext.subarray(idStart, idStart + idLen);
    const recipientId = TEXT_DECODER.decode(recipientIdBytes);

    let pos = idStart + idLen;
    const ephPub = ciphertext.subarray(pos, pos + EPHEMERAL_LEN);
    pos += EPHEMERAL_LEN;
    const mlKemCt = ciphertext.subarray(pos, pos + ML_KEM_CT_LEN);
    pos += ML_KEM_CT_LEN;
    const slotNonce = ciphertext.subarray(pos, pos + NONCE_LEN);
    pos += NONCE_LEN;
    const wrappedCek = ciphertext.subarray(pos, pos + WRAPPED_CEK_LEN);

    slots.push({
      recipientId,
      recipientIdBytes,
      slotIndex: i,
      ephPub,
      mlKemCt,
      slotNonce,
      wrappedCek,
    });
    offset += slotTotalLen;
  }
  return { slots, headerEndOffset: offset };
}

/** Attempts to unwrap CEK from a parsed slot using recipient secret keys. */
function tryUnwrapSlot(
  slot: ParsedSlot,
  recipX25519Sec: Uint8Array,
  recipMlKemSec: Uint8Array,
): Uint8Array | null {
  try {
    const mlKemShared = ml_kem768.decapsulate(slot.mlKemCt, recipMlKemSec);
    const x25519Shared = x25519.getSharedSecret(recipX25519Sec, slot.ephPub);
    const combined = new Uint8Array(64);
    combined.set(x25519Shared, 0);
    combined.set(mlKemShared, 32);

    const kek = hkdf(sha256, combined, slot.ephPub, KEK_INFO, 32);
    const aad = buildSlotAad(slot.recipientIdBytes, slot.slotIndex);
    const cek = xchacha20poly1305(kek, slot.slotNonce, aad).decrypt(
      slot.wrappedCek,
    );

    wipeMemory(x25519Shared);
    wipeMemory(mlKemShared);
    wipeMemory(combined);
    wipeMemory(kek);

    return cek;
  } catch {
    return null;
  }
}

/** Reads next encrypted chunk header from ciphertext. */
function readMultiChunkHeader(
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
    throw new Error("Ciphertext truncated: incomplete chunk");
  }
  return { chunkTag, isFinal, encLen };
}

/** Decrypts stream chunks from ciphertext using recovered CEK. */
function decryptStreamChunks(
  ciphertext: Uint8Array,
  headerEndOffset: number,
  cek: Uint8Array,
  baseNonce: Uint8Array,
  chunkSize: number,
): Uint8Array {
  let offset = headerEndOffset;
  const chunks: Uint8Array[] = [];
  let totalPtLen = 0;
  let sawFinal = false;

  while (offset < ciphertext.length) {
    const { chunkTag, isFinal, encLen } = readMultiChunkHeader(
      ciphertext,
      offset,
      chunkSize,
    );
    offset += 1;

    const chunkIdx = chunks.length;
    const nonce = derivePqChunkNonce(baseNonce, chunkIdx, chunkTag);
    const cipher = xchacha20poly1305(cek, nonce);
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
    throw new Error("Ciphertext truncated: final chunk missing");
  }

  const result = new Uint8Array(totalPtLen);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

/** Resolves CEK and matching recipient slot either by ID or by trial unwrapping. */
function resolveRecipientCek(
  slots: ParsedSlot[],
  recipId: string | undefined,
  recipX25519Sec: Uint8Array,
  recipMlKemSec: Uint8Array,
): { cek: Uint8Array; matchingSlot: ParsedSlot } {
  if (recipId !== undefined) {
    const slot = slots.find((s) => s.recipientId === recipId) ?? null;
    if (!slot) {
      throw new Error(`Recipient ID "${recipId}" not found in stream slots`);
    }
    const cek = tryUnwrapSlot(slot, recipX25519Sec, recipMlKemSec);
    if (!cek) {
      throw new Error(`Decryption failed for recipient slot "${recipId}"`);
    }
    return { cek, matchingSlot: slot };
  }

  for (const slot of slots) {
    const cek = tryUnwrapSlot(slot, recipX25519Sec, recipMlKemSec);
    if (cek) {
      return { cek, matchingSlot: slot };
    }
  }
  throw new Error("No matching recipient key slot could be decrypted");
}

/**
 * Decrypts a multi-recipient hybrid post-quantum stream ciphertext.
 *
 * @param options - Decryption parameters including recipient secret keys and ciphertext.
 * @returns Plaintext bytes and the recipient identifier that decrypted the payload.
 */
export function streamMultiPqDecrypt(
  options: StreamMultiPqDecryptOptions,
): StreamMultiPqDecryptResult {
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
  const ciphertext = options.ciphertext;

  const {
    chunkSize: headerChunkSize,
    baseNonce,
    recipientCount,
  } = parseHeaderPrefix(ciphertext);
  const effectiveChunkSize = options.chunkSize ?? headerChunkSize;
  const { slots, headerEndOffset } = parseSlots(ciphertext, recipientCount);

  const { cek, matchingSlot } = resolveRecipientCek(
    slots,
    options.recipientId,
    recipX25519Sec,
    recipMlKemSec,
  );

  const plaintext = decryptStreamChunks(
    ciphertext,
    headerEndOffset,
    cek,
    baseNonce,
    effectiveChunkSize,
  );
  wipeMemory(cek);

  return {
    plaintext,
    recipientId: matchingSlot.recipientId,
  };
}
