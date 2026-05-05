/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file AES-GCM encryption/decryption via @noble/ciphers.
 *
 * AES-GCM is the most widely deployed AEAD cipher:
 * - 128-bit or 256-bit key security
 * - 96-bit nonce (12 bytes, GCM standard)
 * - Authentication tag prevents tampering
 * - Hardware-accelerated on platforms with AES-NI
 *
 * Nonces are randomly generated and prepended to the ciphertext.
 * Output format: base64(nonce (12B) || ciphertext || tag (16B))
 */

import { gcm, gcmsiv } from "@noble/ciphers/aes";
import { randomBytes } from "@noble/ciphers/webcrypto";

// --- Types ---

export interface AesGcmEncryptOptions {
  /** 128-bit or 256-bit key (16 or 32 bytes), hex string or Uint8Array. */
  key: string | Uint8Array;
  /** Plaintext to encrypt (UTF-8 string or bytes). */
  plaintext: string | Uint8Array;
  /** Optional additional authenticated data. */
  aad?: Uint8Array;
}

export type AesGcmAlgorithm = "aes-256-gcm" | "aes-128-gcm";
export type AesGcmSivAlgorithm = "aes-256-gcm-siv" | "aes-128-gcm-siv";

export interface AesGcmEncryptResult {
  /** Base64-encoded ciphertext (nonce || ciphertext || tag). */
  ciphertext: string;
  /** Algorithm identifier. */
  algorithm: AesGcmAlgorithm;
}

export interface AesGcmSivEncryptOptions {
  /** 128-bit or 256-bit key (16 or 32 bytes), hex string or Uint8Array. */
  key: string | Uint8Array;
  /** Plaintext to encrypt (UTF-8 string or bytes). */
  plaintext: string | Uint8Array;
  /** Optional additional authenticated data. */
  aad?: Uint8Array;
}

export interface AesGcmSivEncryptResult {
  /** Base64-encoded ciphertext (nonce || ciphertext || tag). */
  ciphertext: string;
  /** Algorithm identifier. */
  algorithm: AesGcmSivAlgorithm;
}

export interface AesGcmSivDecryptOptions {
  /** 128-bit or 256-bit key (16 or 32 bytes), hex string or Uint8Array. */
  key: string | Uint8Array;
  /** Base64-encoded ciphertext (as returned by encrypt). */
  ciphertext: string;
  /** Optional additional authenticated data (must match what was used during encryption). */
  aad?: Uint8Array;
}

export interface AesGcmDecryptOptions {
  /** 128-bit or 256-bit key (16 or 32 bytes), hex string or Uint8Array. */
  key: string | Uint8Array;
  /** Base64-encoded ciphertext (as returned by encrypt). */
  ciphertext: string;
  /** Optional additional authenticated data (must match what was used during encryption). */
  aad?: Uint8Array;
}

// --- Helpers ---

const HEX_RE = /^[0-9a-fA-F]*$/;

function toBytes(
  input: string | Uint8Array,
  encoding: "hex" | "utf8" = "utf8",
): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (encoding === "hex") {
    if (!HEX_RE.test(input)) {
      throw new Error("Invalid hex string");
    }
    return Buffer.from(input, "hex");
  }
  return Buffer.from(input, "utf8");
}

const NONCE_LENGTH = 12; // GCM standard 96-bit nonce
const TAG_LENGTH = 16; // GCM 128-bit auth tag

// --- AES-GCM ---

/**
 * Encrypt plaintext using AES-GCM.
 *
 * Returns a single base64 blob: `nonce (12B) || ciphertext || tag (16B)`.
 */
export function aesGcmEncrypt(
  options: AesGcmEncryptOptions,
): AesGcmEncryptResult {
  const key = toBytes(options.key, "hex");
  if (key.length !== 16 && key.length !== 32) {
    throw new Error(
      `Key must be 16 bytes (128 bits) or 32 bytes (256 bits), got ${key.length}`,
    );
  }

  const plaintext = toBytes(options.plaintext, "utf8");
  const nonce = randomBytes(NONCE_LENGTH);

  const cipher = gcm(key, nonce, options.aad);
  const sealed = cipher.encrypt(plaintext);

  // Prepend nonce to ciphertext for self-contained decryption
  const combined = new Uint8Array(NONCE_LENGTH + sealed.length);
  combined.set(nonce);
  combined.set(sealed, NONCE_LENGTH);

  const algorithm: AesGcmAlgorithm =
    key.length === 32 ? "aes-256-gcm" : "aes-128-gcm";

  return {
    ciphertext: Buffer.from(combined).toString("base64"),
    algorithm,
  };
}

/**
 * Decrypt AES-GCM ciphertext.
 *
 * Expects the format produced by `aesGcmEncrypt`: base64(`nonce || ciphertext || tag`).
 */
export function aesGcmDecrypt(options: AesGcmDecryptOptions): Uint8Array {
  const key = toBytes(options.key, "hex");
  if (key.length !== 16 && key.length !== 32) {
    throw new Error(
      `Key must be 16 bytes (128 bits) or 32 bytes (256 bits), got ${key.length}`,
    );
  }

  const combined = Buffer.from(options.ciphertext, "base64");
  if (combined.length < NONCE_LENGTH + TAG_LENGTH) {
    throw new Error("Ciphertext too short — missing nonce or auth tag");
  }

  const nonce = combined.subarray(0, NONCE_LENGTH);
  const sealed = combined.subarray(NONCE_LENGTH);

  const cipher = gcm(key, nonce, options.aad);
  return cipher.decrypt(sealed);
}

// --- AES-GCM-SIV (nonce-misuse resistant) ---

/**
 * Encrypt plaintext using AES-GCM-SIV (nonce-misuse resistant).
 *
 * AES-GCM-SIV (RFC 8452) provides the same AEAD guarantees as GCM but
 * is safe even if a nonce is accidentally reused — the only information
 * leaked is whether two plaintexts are identical.
 *
 * Output format: base64(nonce (12B) || ciphertext || tag (16B))
 */
export function aesGcmSivEncrypt(
  options: AesGcmSivEncryptOptions,
): AesGcmSivEncryptResult {
  const key = toBytes(options.key, "hex");
  if (key.length !== 16 && key.length !== 32) {
    throw new Error(
      `Key must be 16 bytes (128 bits) or 32 bytes (256 bits), got ${key.length}`,
    );
  }

  const plaintext = toBytes(options.plaintext, "utf8");
  const nonce = randomBytes(NONCE_LENGTH);

  const cipher = gcmsiv(key, nonce, options.aad);
  const sealed = cipher.encrypt(plaintext);

  const combined = new Uint8Array(NONCE_LENGTH + sealed.length);
  combined.set(nonce);
  combined.set(sealed, NONCE_LENGTH);

  const algorithm: AesGcmSivAlgorithm =
    key.length === 32 ? "aes-256-gcm-siv" : "aes-128-gcm-siv";

  return {
    ciphertext: Buffer.from(combined).toString("base64"),
    algorithm,
  };
}

/**
 * Decrypt AES-GCM-SIV ciphertext.
 *
 * Expects the format produced by `aesGcmSivEncrypt`: base64(`nonce || ciphertext || tag`).
 */
export function aesGcmSivDecrypt(options: AesGcmSivDecryptOptions): Uint8Array {
  const key = toBytes(options.key, "hex");
  if (key.length !== 16 && key.length !== 32) {
    throw new Error(
      `Key must be 16 bytes (128 bits) or 32 bytes (256 bits), got ${key.length}`,
    );
  }

  const combined = Buffer.from(options.ciphertext, "base64");
  if (combined.length < NONCE_LENGTH + TAG_LENGTH) {
    throw new Error("Ciphertext too short — missing nonce or auth tag");
  }

  const nonce = combined.subarray(0, NONCE_LENGTH);
  const sealed = combined.subarray(NONCE_LENGTH);

  const cipher = gcmsiv(key, nonce, options.aad);
  return cipher.decrypt(sealed);
}
