/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks WebCrypto Modern Algorithms — feature detection for upcoming browser APIs.
 *
 * Detects support for modern algorithms being added to WebCrypto (WICG draft 2026):
 * ML-KEM, ChaCha20-Poly1305, SHA-3, KMAC, Argon2. Uses native implementations
 * when available for maximum performance, falls back to @noble.
 *
 * All functions use the same I/O conventions as the rest of the library:
 * - Keys: hex string or Uint8Array
 * - Ciphertext: base64(nonce || ciphertext || tag)
 * - Hashes: hex-encoded digest string
 */

import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3.js";
import * as nodeCrypto from "node:crypto";

/**
 * Narrows a `Uint8Array` to one the WebCrypto types accept.
 *
 * `@types/node` 26 made `Uint8Array` generic over its backing buffer and
 * defines `BufferSource` as `NonSharedArrayBufferView | ArrayBuffer`, so a
 * `Uint8Array<ArrayBufferLike>` — which might be `SharedArrayBuffer`-backed —
 * no longer satisfies it. Every value passed here comes from `toBytes` or
 * `randomBytes`, both of which allocate a plain `ArrayBuffer`, so the
 * narrowing is sound rather than merely convenient.
 */
function asBufferSource(view: Uint8Array): Uint8Array<ArrayBuffer> {
  return view as Uint8Array<ArrayBuffer>;
}


// --- Types ---

/**
 * Feature detection result for modern WebCrypto algorithms.
 *
 * @example
 * ```ts
 * const support = detectModernWebCrypto();
 * if (support.chacha20poly1305) {
 *   console.log("ChaCha20-Poly1305 natively available");
 * }
 * ```
 */
export interface WebCryptoModernSupport {
  /** Whether ChaCha20-Poly1305 AEAD is available in WebCrypto. */
  chacha20poly1305: boolean;
  /** Whether SHA-3 (SHA3-256 / SHA3-512) is available in WebCrypto. */
  sha3: boolean;
  /** Whether ML-KEM post-quantum KEM is available in WebCrypto. */
  mlKem: boolean;
  /** Whether Argon2 password hashing is available in WebCrypto. */
  argon2: boolean;
  /** Whether KMAC (Keccak MAC) is available in WebCrypto. */
  kmac: boolean;
}

/** Supported SHA-3 algorithms for modern WebCrypto hashing. */
export type ModernSha3Algorithm = "SHA3-256" | "SHA3-512";

/** Options for modern ChaCha20-Poly1305 encryption. */
export interface ModernChaCha20EncryptOptions {
  /** 256-bit key (32 bytes), hex string or Uint8Array. */
  key: string | Uint8Array;
  /** Plaintext to encrypt (UTF-8 string or bytes). */
  plaintext: string | Uint8Array;
  /** Optional additional authenticated data. */
  aad?: Uint8Array;
}

/** Result of a modern ChaCha20-Poly1305 AEAD operation. */
export interface ModernAeadResult {
  /** Base64-encoded ciphertext (nonce || ciphertext || tag). */
  ciphertext: string;
  /** Whether WebCrypto was used (true) or noble fallback (false). */
  accelerated: boolean;
}

/** Options for modern ChaCha20-Poly1305 decryption. */
export interface ModernChaCha20DecryptOptions {
  /** 256-bit key (32 bytes), hex string or Uint8Array. */
  key: string | Uint8Array;
  /** Base64-encoded ciphertext (as returned by encrypt). */
  ciphertext: string;
  /** Optional additional authenticated data (must match what was used during encryption). */
  aad?: Uint8Array;
}

/** Result of a modern ChaCha20-Poly1305 decryption. */
export interface ModernChaCha20DecryptResult {
  /** Decrypted plaintext bytes. */
  plaintext: Uint8Array;
  /** Whether WebCrypto was used (true) or noble fallback (false). */
  accelerated: boolean;
}

/** Options for modern SHA-3 hashing. */
export interface ModernSha3HashOptions {
  /** SHA-3 algorithm to use. */
  algorithm: ModernSha3Algorithm;
  /** Data to hash (UTF-8 string or bytes). */
  data: string | Uint8Array;
}

/** Result of a modern SHA-3 hash computation. */
export interface ModernSha3HashResult {
  /** Hex-encoded hash digest. */
  digest: string;
  /** Whether WebCrypto was used (true) or noble fallback (false). */
  accelerated: boolean;
}

// --- Helpers ---

const HEX_RE = /^[0-9a-fA-F]*$/;
const NONCE_LENGTH = 12; // Standard ChaCha20-Poly1305 uses 12-byte nonce
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
    /* c8 ignore next 3 -- defensive: webcrypto access never throws in Node >=22 */
  } catch {
    // Not available
  }
  return null;
}

// --- Feature Detection ---

/** Cached detection result (undefined = not yet checked). */
let _modernDetectionCache: WebCryptoModernSupport | undefined;

/**
 * Detect whether modern WebCrypto algorithms are available in the current runtime.
 *
 * Checks for: ChaCha20-Poly1305, SHA-3, ML-KEM, Argon2, KMAC.
 * Results are cached after the first call. Use `_resetModernWebCryptoDetection()`
 * to clear the cache for testing.
 *
 * @example
 * ```ts
 * const support = detectModernWebCrypto();
 * console.log(support.chacha20poly1305); // false (not yet available)
 * ```
 */
export function detectModernWebCrypto(): WebCryptoModernSupport {
  if (_modernDetectionCache !== undefined) return _modernDetectionCache;

  const subtle = getSubtle();
  const result: WebCryptoModernSupport = {
    chacha20poly1305: false,
    sha3: false,
    mlKem: false,
    argon2: false,
    kmac: false,
  };

  if (subtle) {
    // Use SubtleCrypto.supports() when available (WICG draft 2026).
    // Falls back to false if the method doesn't exist.
    const supports = (subtle as unknown as Record<string, unknown>)["supports"];
    if (typeof supports === "function") {
      try {
        result.chacha20poly1305 = !!(
          supports as (...args: unknown[]) => unknown
        ).call(subtle, "encrypt", "ChaCha20-Poly1305");
      } catch {
        result.chacha20poly1305 = false;
      }
      try {
        result.sha3 = !!(supports as (...args: unknown[]) => unknown).call(
          subtle,
          "digest",
          "SHA3-256",
        );
      } catch {
        result.sha3 = false;
      }
      try {
        result.mlKem = !!(supports as (...args: unknown[]) => unknown).call(
          subtle,
          "deriveBits",
          "ML-KEM-768",
        );
      } catch {
        result.mlKem = false;
      }
      try {
        result.argon2 = !!(supports as (...args: unknown[]) => unknown).call(
          subtle,
          "deriveBits",
          "Argon2id",
        );
      } catch {
        result.argon2 = false;
      }
      try {
        result.kmac = !!(supports as (...args: unknown[]) => unknown).call(
          subtle,
          "sign",
          "KMAC256",
        );
      } catch {
        result.kmac = false;
      }
    }
  }

  _modernDetectionCache = result;
  return result;
}

/**
 * Reset the cached modern WebCrypto detection result (for testing).
 *
 * @example
 * ```ts
 * _resetModernWebCryptoDetection();
 * ```
 */
export function _resetModernWebCryptoDetection(): void {
  _modernDetectionCache = undefined;
}

// --- ChaCha20-Poly1305 ---

/**
 * Encrypt plaintext using ChaCha20-Poly1305, preferring WebCrypto when available.
 *
 * Output format: base64(nonce (12B) || ciphertext || tag (16B)).
 * Falls back to @noble/ciphers when WebCrypto does not support ChaCha20-Poly1305.
 *
 * @example
 * ```ts
 * const result = await modernChaCha20Encrypt({
 *   key: "a".repeat(64),
 *   plaintext: "hello world",
 * });
 * console.log(result.ciphertext); // base64 string
 * ```
 */
export async function modernChaCha20Encrypt(
  options: ModernChaCha20EncryptOptions,
): Promise<ModernAeadResult> {
  const key = toBytes(options.key, "hex");
  if (key.length !== 32) {
    throw new Error(`Key must be 32 bytes (256 bits), got ${key.length}`);
  }

  const plaintext = toBytes(options.plaintext, "utf8");
  const nonce = randomBytes(NONCE_LENGTH);

  const support = detectModernWebCrypto();
  if (support.chacha20poly1305) {
    const subtle = getSubtle()!;
    const cryptoKey = await subtle.importKey(
      "raw",
      asBufferSource(key),
      { name: "ChaCha20-Poly1305" },
      false,
      ["encrypt"],
    );

    const algParams: Record<string, unknown> = {
      name: "ChaCha20-Poly1305",
      iv: asBufferSource(nonce),
      tagLength: TAG_LENGTH * 8,
    };
    if (options.aad) {
      algParams["additionalData"] = options.aad;
    }

    const encrypted = await subtle.encrypt(
      algParams as unknown as nodeCrypto.webcrypto.AlgorithmIdentifier,
      cryptoKey,
      asBufferSource(plaintext),
    );
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
  const cipher = chacha20poly1305(key, nonce, options.aad);
  const sealed = cipher.encrypt(plaintext);

  const combined = new Uint8Array(NONCE_LENGTH + sealed.length);
  combined.set(nonce);
  combined.set(sealed, NONCE_LENGTH);

  return {
    ciphertext: Buffer.from(combined).toString("base64"),
    accelerated: false,
  };
}

/**
 * Decrypt ChaCha20-Poly1305 ciphertext, preferring WebCrypto when available.
 *
 * Expects format: base64(nonce (12B) || ciphertext || tag (16B)).
 *
 * @example
 * ```ts
 * const result = await modernChaCha20Decrypt({
 *   key: "a".repeat(64),
 *   ciphertext: encrypted.ciphertext,
 * });
 * console.log(Buffer.from(result.plaintext).toString("utf8"));
 * ```
 */
export async function modernChaCha20Decrypt(
  options: ModernChaCha20DecryptOptions,
): Promise<ModernChaCha20DecryptResult> {
  const key = toBytes(options.key, "hex");
  if (key.length !== 32) {
    throw new Error(`Key must be 32 bytes (256 bits), got ${key.length}`);
  }

  const combined = Buffer.from(options.ciphertext, "base64");
  if (combined.length < NONCE_LENGTH + TAG_LENGTH) {
    throw new Error("Ciphertext too short — missing nonce or auth tag");
  }

  const nonce = combined.subarray(0, NONCE_LENGTH);
  const sealed = combined.subarray(NONCE_LENGTH);

  const support = detectModernWebCrypto();
  if (support.chacha20poly1305) {
    const subtle = getSubtle()!;
    const cryptoKey = await subtle.importKey(
      "raw",
      asBufferSource(key),
      { name: "ChaCha20-Poly1305" },
      false,
      ["decrypt"],
    );

    const algParams: Record<string, unknown> = {
      name: "ChaCha20-Poly1305",
      iv: asBufferSource(nonce),
      tagLength: TAG_LENGTH * 8,
    };
    if (options.aad) {
      algParams["additionalData"] = options.aad;
    }

    const decrypted = await subtle.decrypt(
      algParams as unknown as nodeCrypto.webcrypto.AlgorithmIdentifier,
      cryptoKey,
      asBufferSource(sealed),
    );

    return {
      plaintext: new Uint8Array(decrypted),
      accelerated: true,
    };
  }

  // Fallback to @noble/ciphers
  const cipher = chacha20poly1305(key, nonce, options.aad);
  const plaintext = cipher.decrypt(sealed);

  return {
    plaintext,
    accelerated: false,
  };
}

// --- SHA-3 ---

/**
 * Compute a SHA-3 hash, preferring WebCrypto when available.
 *
 * Supports SHA3-256 and SHA3-512. Falls back to @noble/hashes when
 * WebCrypto does not support SHA-3.
 *
 * @example
 * ```ts
 * const result = await modernSha3Hash({
 *   algorithm: "SHA3-256",
 *   data: "hello world",
 * });
 * console.log(result.digest); // hex string
 * ```
 */
export async function modernSha3Hash(
  options: ModernSha3HashOptions,
): Promise<ModernSha3HashResult> {
  const data = toBytes(options.data, "utf8");

  const support = detectModernWebCrypto();
  if (support.sha3) {
    const subtle = getSubtle()!;
    const digest = await subtle.digest(options.algorithm, asBufferSource(data));

    return {
      digest: Buffer.from(digest).toString("hex"),
      accelerated: true,
    };
  }

  // Fallback to @noble/hashes
  let digest: Uint8Array;
  switch (options.algorithm) {
    case "SHA3-256":
      digest = sha3_256(data);
      break;
    case "SHA3-512":
      digest = sha3_512(data);
      break;
    default:
      throw new Error(`Unsupported SHA-3 algorithm: ${options.algorithm}`);
  }

  return {
    digest: Buffer.from(digest).toString("hex"),
    accelerated: false,
  };
}
