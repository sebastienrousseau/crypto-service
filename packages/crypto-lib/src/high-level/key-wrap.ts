/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Key wrapping — AES-KW (RFC 3394), AES-KWP (RFC 5649), and
 * X25519 + AES-KW for public-key key wrapping.
 *
 * Key wrapping protects symmetric keys during transport or storage.
 * - AES-KW: wraps keys that are multiples of 8 bytes (min 16 bytes).
 * - AES-KWP: wraps arbitrary-length data (with padding).
 * - X25519 + AES-KW: derive a wrapping key via ECDH, then AES-KW.
 */

import { aeskw, aeskwp } from "@noble/ciphers/aes";
import { x25519 } from "@noble/curves/ed25519";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { randomBytes } from "@noble/ciphers/webcrypto";

const HEX_RE = /^[0-9a-fA-F]*$/;

function hexToBytes(hex: string): Uint8Array {
  if (!HEX_RE.test(hex)) throw new Error("Invalid hex string");
  return Buffer.from(hex, "hex");
}

function toKey(key: string | Uint8Array): Uint8Array {
  if (key instanceof Uint8Array) return key;
  return hexToBytes(key);
}

// --- Types ---

/** Result of an AES-KW or AES-KWP key wrapping operation. */
export interface AesKwWrapResult {
  /** Base64-encoded wrapped key. */
  wrapped: string;
  /** Algorithm identifier. */
  algorithm: "aes-kw" | "aes-kwp";
}

/** Result of an X25519 ECDH + AES-KW key wrapping operation. */
export interface X25519AesKwWrapResult {
  /** Base64-encoded wrapped key. */
  wrapped: string;
  /** Hex-encoded ephemeral X25519 public key (32 bytes). */
  ephemeralPublicKey: string;
  /** Algorithm identifier. */
  algorithm: "x25519-aes-kw";
}

// --- AES-KW (RFC 3394) ---

/**
 * Wrap a key using AES-KW (RFC 3394).
 *
 * @param kek - Key-encryption key (16, 24, or 32 bytes; hex or bytes).
 * @param keyToWrap - Key material to wrap (must be >= 16 bytes, multiple of 8).
 */
export function aesKwWrap(
  kek: string | Uint8Array,
  keyToWrap: string | Uint8Array,
): AesKwWrapResult {
  const kekBytes = toKey(kek);
  const keyBytes = toKey(keyToWrap);
  const cipher = aeskw(kekBytes);
  const wrapped = cipher.encrypt(keyBytes);
  return {
    wrapped: Buffer.from(wrapped).toString("base64"),
    algorithm: "aes-kw",
  };
}

/**
 * Unwrap a key using AES-KW (RFC 3394).
 *
 * @param kek - Key-encryption key (hex or bytes).
 * @param wrappedKey - Base64-encoded wrapped key.
 */
export function aesKwUnwrap(
  kek: string | Uint8Array,
  wrappedKey: string | Uint8Array,
): Uint8Array {
  const kekBytes = toKey(kek);
  const wrapped =
    wrappedKey instanceof Uint8Array
      ? wrappedKey
      : Buffer.from(wrappedKey, "base64");
  const cipher = aeskw(kekBytes);
  return cipher.decrypt(wrapped);
}

// --- AES-KWP (RFC 5649) ---

/**
 * Wrap arbitrary-length data using AES-KWP (RFC 5649 with padding).
 *
 * @param kek - Key-encryption key (16, 24, or 32 bytes; hex or bytes).
 * @param data - Data to wrap (any length >= 1 byte).
 */
export function aesKwpWrap(
  kek: string | Uint8Array,
  data: string | Uint8Array,
): AesKwWrapResult {
  const kekBytes = toKey(kek);
  const dataBytes = toKey(data);
  const cipher = aeskwp(kekBytes);
  const wrapped = cipher.encrypt(dataBytes);
  return {
    wrapped: Buffer.from(wrapped).toString("base64"),
    algorithm: "aes-kwp",
  };
}

/**
 * Unwrap data using AES-KWP (RFC 5649).
 *
 * @param kek - Key-encryption key (hex or bytes).
 * @param wrappedData - Base64-encoded wrapped data.
 */
export function aesKwpUnwrap(
  kek: string | Uint8Array,
  wrappedData: string | Uint8Array,
): Uint8Array {
  const kekBytes = toKey(kek);
  const wrapped =
    wrappedData instanceof Uint8Array
      ? wrappedData
      : Buffer.from(wrappedData, "base64");
  const cipher = aeskwp(kekBytes);
  return cipher.decrypt(wrapped);
}

// --- X25519 + AES-KW ---

/**
 * Wrap a key using X25519 ECDH to derive a KEK, then AES-KW.
 *
 * An ephemeral X25519 key pair is generated; the shared secret is
 * derived via HKDF-SHA256. The ephemeral public key is returned so
 * the recipient can recompute the KEK.
 *
 * @param recipientPublicKey - Recipient's X25519 public key (hex, 32 bytes).
 * @param keyToWrap - Key material to wrap (>= 16 bytes, multiple of 8).
 */
export function x25519AesKwWrap(
  recipientPublicKey: string | Uint8Array,
  keyToWrap: string | Uint8Array,
): X25519AesKwWrapResult {
  const recipPub =
    typeof recipientPublicKey === "string"
      ? hexToBytes(recipientPublicKey)
      : recipientPublicKey;
  const keyBytes = toKey(keyToWrap);

  const ephPriv = randomBytes(32);
  const ephPub = x25519.getPublicKey(ephPriv);
  const raw = x25519.getSharedSecret(ephPriv, recipPub);
  const kek = hkdf(sha256, raw, ephPub, "x25519-aes-kw-v1", 32);

  const cipher = aeskw(kek);
  const wrapped = cipher.encrypt(keyBytes);

  return {
    wrapped: Buffer.from(wrapped).toString("base64"),
    ephemeralPublicKey: Buffer.from(ephPub).toString("hex"),
    algorithm: "x25519-aes-kw",
  };
}

/**
 * Unwrap a key using X25519 ECDH + AES-KW.
 *
 * @param recipientSecretKey - Recipient's X25519 secret key (hex, 32 bytes).
 * @param ephemeralPublicKey - Sender's ephemeral X25519 public key (hex, 32 bytes).
 * @param wrappedKey - Base64-encoded wrapped key.
 */
export function x25519AesKwUnwrap(
  recipientSecretKey: string | Uint8Array,
  ephemeralPublicKey: string | Uint8Array,
  wrappedKey: string | Uint8Array,
): Uint8Array {
  const secKey =
    typeof recipientSecretKey === "string"
      ? hexToBytes(recipientSecretKey)
      : recipientSecretKey;
  const ephPub =
    typeof ephemeralPublicKey === "string"
      ? hexToBytes(ephemeralPublicKey)
      : ephemeralPublicKey;
  /* c8 ignore next 3 -- type coercion branch: wrappedKey is always base64 string from multiEncrypt */
  const wrapped =
    wrappedKey instanceof Uint8Array
      ? wrappedKey
      : Buffer.from(wrappedKey, "base64");

  const raw = x25519.getSharedSecret(secKey, ephPub);
  const kek = hkdf(sha256, raw, ephPub, "x25519-aes-kw-v1", 32);

  const cipher = aeskw(kek);
  return cipher.decrypt(wrapped);
}
