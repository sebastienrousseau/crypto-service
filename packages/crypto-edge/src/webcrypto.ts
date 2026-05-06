/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Web Crypto API wrapper for edge runtimes.
 *
 * Every function in this module uses **only** the standard Web Crypto
 * API (`crypto.subtle`) and global encoding helpers (`TextEncoder`,
 * `Uint8Array`). No Node.js built-ins (`Buffer`, `node:crypto`, `fs`,
 * etc.) are imported, making this module safe to run in Cloudflare
 * Workers, Vercel Edge, Deno, Bun, and browsers.
 */

import type {
  EdgeHashAlgorithm,
  EdgeEncryptOptions,
  EdgeEncryptResult,
  EdgeDecryptOptions,
  EdgeHmacSignOptions,
  EdgeHmacVerifyOptions,
  EdgeGenerateKeyOptions,
  EdgeKeyAlgorithm,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IV_LENGTH = 12; // 96-bit IV for AES-GCM

/**
 * Get the `SubtleCrypto` interface or throw if unavailable.
 */
function getSubtle(): SubtleCrypto {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.subtle !== "undefined"
  ) {
    return globalThis.crypto.subtle;
  }
  throw new Error(
    "Web Crypto API (crypto.subtle) is not available in this runtime.",
  );
}

/**
 * Generate cryptographically secure random bytes.
 * Uses `crypto.getRandomValues` which is available in all target runtimes.
 */
function randomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  globalThis.crypto.getRandomValues(buf);
  return buf;
}

/**
 * Encode a UTF-8 string to bytes. Uses the global `TextEncoder`.
 */
function toBytes(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) return input;
  return new TextEncoder().encode(input);
}

/**
 * Convert a Uint8Array to a lowercase hex string without relying on
 * `Buffer`.
 */
function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Concatenate two Uint8Arrays into one.
 */
function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}

// ---------------------------------------------------------------------------
// Hash
// ---------------------------------------------------------------------------

/**
 * Compute a cryptographic hash digest using the Web Crypto API.
 *
 * @param algorithm - One of `"SHA-1"`, `"SHA-256"`, `"SHA-384"`, `"SHA-512"`.
 * @param data - The data to hash (string or bytes).
 * @returns Hex-encoded digest string.
 *
 * @example
 * ```ts
 * const digest = await hash("SHA-256", "hello world");
 * ```
 */
export async function hash(
  algorithm: EdgeHashAlgorithm,
  data: string | Uint8Array,
): Promise<string> {
  const subtle = getSubtle();
  const input = toBytes(data);
  const digest = await subtle.digest(algorithm, input);
  return toHex(new Uint8Array(digest));
}

// ---------------------------------------------------------------------------
// AES-GCM Encrypt
// ---------------------------------------------------------------------------

/**
 * Encrypt data using AES-GCM via the Web Crypto API.
 *
 * Output format: `iv (12 bytes) || ciphertext || tag`
 *
 * @param options - Encryption parameters.
 * @returns The IV-prefixed ciphertext and IV length.
 *
 * @example
 * ```ts
 * const key = await generateKey({ algorithm: "AES-GCM" });
 * const { ciphertext } = await encrypt({
 *   key,
 *   plaintext: new TextEncoder().encode("secret"),
 * });
 * ```
 */
export async function encrypt(
  options: EdgeEncryptOptions,
): Promise<EdgeEncryptResult> {
  const subtle = getSubtle();
  const { key, plaintext, aad } = options;

  if (key.length !== 16 && key.length !== 32) {
    throw new Error(
      `Key must be 16 bytes (128-bit) or 32 bytes (256-bit), got ${key.length}`,
    );
  }

  const iv = randomBytes(IV_LENGTH);

  const cryptoKey = await subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const params: AesGcmParams = {
    name: "AES-GCM",
    iv,
    tagLength: 128,
  };
  if (aad) {
    params.additionalData = aad;
  }

  const encrypted = await subtle.encrypt(params, cryptoKey, plaintext);
  const sealed = new Uint8Array(encrypted);

  return {
    ciphertext: concat(iv, sealed),
    ivLength: IV_LENGTH,
  };
}

// ---------------------------------------------------------------------------
// AES-GCM Decrypt
// ---------------------------------------------------------------------------

/**
 * Decrypt AES-GCM ciphertext produced by {@link encrypt}.
 *
 * Expects format: `iv (12 bytes) || ciphertext || tag`
 *
 * @param options - Decryption parameters.
 * @returns The decrypted plaintext bytes.
 *
 * @example
 * ```ts
 * const plaintext = await decrypt({ key, ciphertext: encrypted.ciphertext });
 * ```
 */
export async function decrypt(
  options: EdgeDecryptOptions,
): Promise<Uint8Array> {
  const subtle = getSubtle();
  const { key, ciphertext, aad } = options;
  const ivLen = options.ivLength ?? IV_LENGTH;

  if (key.length !== 16 && key.length !== 32) {
    throw new Error(
      `Key must be 16 bytes (128-bit) or 32 bytes (256-bit), got ${key.length}`,
    );
  }

  if (ciphertext.length < ivLen + 16) {
    throw new Error("Ciphertext too short -- missing IV or auth tag");
  }

  const iv = ciphertext.slice(0, ivLen);
  const sealed = ciphertext.slice(ivLen);

  const cryptoKey = await subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const params: AesGcmParams = {
    name: "AES-GCM",
    iv,
    tagLength: 128,
  };
  if (aad) {
    params.additionalData = aad;
  }

  const decrypted = await subtle.decrypt(params, cryptoKey, sealed);
  return new Uint8Array(decrypted);
}

// ---------------------------------------------------------------------------
// HMAC Sign
// ---------------------------------------------------------------------------

/**
 * Compute an HMAC signature using the Web Crypto API.
 *
 * @param options - Signing parameters (key, data, optional hash algorithm).
 * @returns The HMAC signature bytes.
 *
 * @example
 * ```ts
 * const sig = await sign(
 *   new Uint8Array(32), // key
 *   new TextEncoder().encode("hello"),
 * );
 * ```
 */
export async function sign(options: EdgeHmacSignOptions): Promise<Uint8Array> {
  const subtle = getSubtle();
  const { key, data } = options;
  const hashAlg = options.hash ?? "SHA-256";

  const cryptoKey = await subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: { name: hashAlg } },
    false,
    ["sign"],
  );

  const signature = await subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(signature);
}

// ---------------------------------------------------------------------------
// HMAC Verify
// ---------------------------------------------------------------------------

/**
 * Verify an HMAC signature using the Web Crypto API.
 *
 * @param options - Verification parameters.
 * @returns `true` if the signature is valid.
 *
 * @example
 * ```ts
 * const valid = await verify({
 *   key,
 *   data: payload,
 *   signature: sig,
 * });
 * ```
 */
export async function verify(options: EdgeHmacVerifyOptions): Promise<boolean> {
  const subtle = getSubtle();
  const { key, data, signature } = options;
  const hashAlg = options.hash ?? "SHA-256";

  const cryptoKey = await subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: { name: hashAlg } },
    false,
    ["verify"],
  );

  return subtle.verify("HMAC", cryptoKey, signature, data);
}

// ---------------------------------------------------------------------------
// Key Generation
// ---------------------------------------------------------------------------

/**
 * Generate a symmetric key using the Web Crypto API.
 *
 * @param options - Key generation parameters (algorithm, optional bit length).
 * @returns The raw key bytes extracted from the generated `CryptoKey`.
 *
 * @example
 * ```ts
 * const key = await generateKey({ algorithm: "AES-GCM", length: 256 });
 * // key is a 32-byte Uint8Array
 * ```
 */
export async function generateKey(
  options: EdgeGenerateKeyOptions,
): Promise<Uint8Array> {
  const subtle = getSubtle();
  const { algorithm } = options;
  const length = options.length ?? 256;

  const algParam = buildKeyGenParams(algorithm, length);

  const cryptoKey = await subtle.generateKey(algParam, true, [
    "encrypt",
    "decrypt",
  ]);

  const raw = await subtle.exportKey("raw", cryptoKey as CryptoKey);
  return new Uint8Array(raw);
}

/**
 * Build the `AesKeyGenParams` object for key generation.
 */
function buildKeyGenParams(
  algorithm: EdgeKeyAlgorithm,
  length: number,
): AesKeyGenParams {
  switch (algorithm) {
    case "AES-GCM":
    case "AES-CBC":
    case "AES-CTR":
      return { name: algorithm, length };
    default:
      throw new Error(`Unsupported key generation algorithm: ${algorithm}`);
  }
}

// ---------------------------------------------------------------------------
// Utility Exports
// ---------------------------------------------------------------------------

export { toHex, toBytes, randomBytes, concat };
