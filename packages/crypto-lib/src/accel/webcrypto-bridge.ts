/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file WebCrypto acceleration layer.
 *
 * Provides hardware-accelerated versions of AES-GCM and SHA-2 hashing
 * via the Web Crypto API when available. Falls back transparently to
 * @noble/ciphers and @noble/hashes when `crypto.subtle` is not present
 * (e.g., older Node.js builds without global WebCrypto).
 *
 * All functions use the same I/O conventions as the rest of the library:
 * - Keys: hex string or Uint8Array
 * - Ciphertext: base64(nonce || ciphertext || tag)
 * - Hashes: hex-encoded digest string
 */

import { gcm } from "@noble/ciphers/aes";
import { randomBytes } from "@noble/ciphers/webcrypto";
import { sha256 } from "@noble/hashes/sha256";
import { sha384, sha512 } from "@noble/hashes/sha512";
import * as nodeCrypto from "node:crypto";

// --- Types ---

/** Supported SHA-2 algorithms for WebCrypto hashing. */
export type WebCryptoHashAlgorithm = "SHA-256" | "SHA-384" | "SHA-512";

/** Options for WebCrypto-accelerated AES-GCM encryption. */
export interface WebCryptoAesGcmEncryptOptions {
  /** 128-bit or 256-bit key (16 or 32 bytes), hex string or Uint8Array. */
  key: string | Uint8Array;
  /** Plaintext to encrypt (UTF-8 string or bytes). */
  plaintext: string | Uint8Array;
  /** Optional additional authenticated data. */
  aad?: Uint8Array;
}

/** Result of a WebCrypto-accelerated AES-GCM encryption. */
export interface WebCryptoAesGcmEncryptResult {
  /** Base64-encoded ciphertext (nonce || ciphertext || tag). */
  ciphertext: string;
  /** Whether WebCrypto was used (true) or noble fallback (false). */
  accelerated: boolean;
}

/** Options for WebCrypto-accelerated AES-GCM decryption. */
export interface WebCryptoAesGcmDecryptOptions {
  /** 128-bit or 256-bit key (16 or 32 bytes), hex string or Uint8Array. */
  key: string | Uint8Array;
  /** Base64-encoded ciphertext (as returned by encrypt). */
  ciphertext: string;
  /** Optional additional authenticated data (must match what was used during encryption). */
  aad?: Uint8Array;
}

/** Result of a WebCrypto-accelerated AES-GCM decryption. */
export interface WebCryptoAesGcmDecryptResult {
  /** Decrypted plaintext bytes. */
  plaintext: Uint8Array;
  /** Whether WebCrypto was used (true) or noble fallback (false). */
  accelerated: boolean;
}

/** Options for WebCrypto-accelerated SHA-2 hashing. */
export interface WebCryptoHashOptions {
  /** Hash algorithm to use. */
  algorithm: WebCryptoHashAlgorithm;
  /** Data to hash (UTF-8 string or bytes). */
  data: string | Uint8Array;
}

/** Result of a WebCrypto-accelerated hash computation. */
export interface WebCryptoHashResult {
  /** Hex-encoded hash digest. */
  digest: string;
  /** Whether WebCrypto was used (true) or noble fallback (false). */
  accelerated: boolean;
}

// --- Helpers ---

const HEX_RE = /^[0-9a-fA-F]*$/;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;

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

function validateKey(key: Uint8Array): void {
  if (key.length !== 16 && key.length !== 32) {
    throw new Error(
      `Key must be 16 bytes (128 bits) or 32 bytes (256 bits), got ${key.length}`,
    );
  }
}

/**
 * Get a reference to the WebCrypto subtle interface, if available.
 * Uses `node:crypto.webcrypto` for reliable access in Node.js.
 */
function getSubtle(): typeof nodeCrypto.webcrypto.subtle | null {
  try {
    if (
      nodeCrypto.webcrypto &&
      nodeCrypto.webcrypto.subtle &&
      typeof nodeCrypto.webcrypto.subtle.encrypt === "function"
    ) {
      return nodeCrypto.webcrypto.subtle;
    }
  } catch {
    // Not available
  }
  return null;
}

// --- Feature Detection ---

/**
 * Detect whether the WebCrypto `crypto.subtle` API is available in the
 * current runtime environment.
 */
export function isWebCryptoAvailable(): boolean {
  return getSubtle() !== null;
}

// --- AES-GCM Encrypt ---

/**
 * Encrypt plaintext using AES-GCM, preferring WebCrypto hardware acceleration.
 *
 * Output format: base64(nonce (12B) || ciphertext || tag (16B))
 * Compatible with the noble-based `aesGcmDecrypt` from `modern/aes.ts`.
 */
export async function webCryptoAesGcmEncrypt(
  options: WebCryptoAesGcmEncryptOptions,
): Promise<WebCryptoAesGcmEncryptResult> {
  const key = toBytes(options.key, "hex");
  validateKey(key);
  const plaintext = toBytes(options.plaintext, "utf8");
  const nonce = randomBytes(NONCE_LENGTH);

  const subtle = getSubtle();
  if (subtle) {
    const cryptoKey = await subtle.importKey(
      "raw",
      key,
      { name: "AES-GCM" },
      false,
      ["encrypt"],
    );

    const algParams: nodeCrypto.webcrypto.AesGcmParams = {
      name: "AES-GCM",
      iv: nonce,
      tagLength: TAG_LENGTH * 8,
    };
    if (options.aad) {
      algParams.additionalData = options.aad;
    }

    const encrypted = await subtle.encrypt(algParams, cryptoKey, plaintext);

    // WebCrypto returns ciphertext || tag in a single ArrayBuffer
    const sealed = new Uint8Array(encrypted);
    const combined = new Uint8Array(NONCE_LENGTH + sealed.length);
    combined.set(nonce);
    combined.set(sealed, NONCE_LENGTH);

    return {
      ciphertext: Buffer.from(combined).toString("base64"),
      accelerated: true,
    };
  }

  // Fallback to @noble/ciphers
  const cipher = gcm(key, nonce, options.aad);
  const sealed = cipher.encrypt(plaintext);

  const combined = new Uint8Array(NONCE_LENGTH + sealed.length);
  combined.set(nonce);
  combined.set(sealed, NONCE_LENGTH);

  return {
    ciphertext: Buffer.from(combined).toString("base64"),
    accelerated: false,
  };
}

// --- AES-GCM Decrypt ---

/**
 * Decrypt AES-GCM ciphertext, preferring WebCrypto hardware acceleration.
 *
 * Expects format: base64(nonce (12B) || ciphertext || tag (16B))
 */
export async function webCryptoAesGcmDecrypt(
  options: WebCryptoAesGcmDecryptOptions,
): Promise<WebCryptoAesGcmDecryptResult> {
  const key = toBytes(options.key, "hex");
  validateKey(key);

  const combined = Buffer.from(options.ciphertext, "base64");
  if (combined.length < NONCE_LENGTH + TAG_LENGTH) {
    throw new Error("Ciphertext too short — missing nonce or auth tag");
  }

  const nonce = combined.subarray(0, NONCE_LENGTH);
  const sealed = combined.subarray(NONCE_LENGTH);

  const subtle = getSubtle();
  if (subtle) {
    const cryptoKey = await subtle.importKey(
      "raw",
      key,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );

    const algParams: nodeCrypto.webcrypto.AesGcmParams = {
      name: "AES-GCM",
      iv: nonce,
      tagLength: TAG_LENGTH * 8,
    };
    if (options.aad) {
      algParams.additionalData = options.aad;
    }

    const decrypted = await subtle.decrypt(algParams, cryptoKey, sealed);

    return {
      plaintext: new Uint8Array(decrypted),
      accelerated: true,
    };
  }

  // Fallback to @noble/ciphers
  const cipher = gcm(key, nonce, options.aad);
  const plaintext = cipher.decrypt(sealed);

  return {
    plaintext,
    accelerated: false,
  };
}

// --- Hash ---

/**
 * Compute a SHA-2 hash, preferring WebCrypto hardware acceleration.
 *
 * Supports SHA-256, SHA-384, and SHA-512.
 */
export async function webCryptoHash(
  options: WebCryptoHashOptions,
): Promise<WebCryptoHashResult> {
  const data = toBytes(options.data, "utf8");

  const subtle = getSubtle();
  if (subtle) {
    const digest = await subtle.digest(options.algorithm, data);

    return {
      digest: Buffer.from(digest).toString("hex"),
      accelerated: true,
    };
  }

  // Fallback to @noble/hashes
  let digest: Uint8Array;
  switch (options.algorithm) {
    case "SHA-256":
      digest = sha256(data);
      break;
    case "SHA-384":
      digest = sha384(data);
      break;
    case "SHA-512":
      digest = sha512(data);
      break;
    default:
      throw new Error(`Unsupported hash algorithm: ${options.algorithm}`);
  }

  return {
    digest: Buffer.from(digest).toString("hex"),
    accelerated: false,
  };
}
