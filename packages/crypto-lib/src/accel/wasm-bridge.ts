/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks WASM acceleration bridge — optional high-performance crypto via WebAssembly.
 *
 * When a WASM-capable runtime is detected (Node.js, browsers with WASM SIMD),
 * this module can leverage WASM implementations for 5-10x speedups on hash
 * and AEAD operations. Falls back transparently to @noble pure-JS.
 *
 * Performance targets (WASM with SIMD):
 * - BLAKE3: ~10 GB/s (vs ~600 MB/s pure JS)
 * - ChaCha20: ~6.4 GB/s (vs ~300 MB/s pure JS)
 * - SHA-256: ~2 GB/s (vs ~400 MB/s pure JS)
 *
 * The bridge is designed for `awasm-noble` (auditable WASM crypto by paulmillr)
 * once it ships on npm. Until then, the pure-JS @noble backend is used.
 */

import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3.js";
import { blake3 } from "@noble/hashes/blake3.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";

// --- Types ---

/** Crypto backend in use for WASM-accelerated operations. */
export type WasmBackend = "wasm-simd" | "wasm" | "js";

/** Hash algorithms available through the WASM bridge. */
export type WasmHashAlgorithm =
  | "sha256"
  | "sha512"
  | "sha3-256"
  | "sha3-512"
  | "blake3";

/** Options for WASM-accelerated hashing. */
export interface WasmHashOptions {
  /** Hash algorithm to use. */
  algorithm: WasmHashAlgorithm;
  /** Data to hash (hex string, UTF-8 string, or bytes). */
  data: string | Uint8Array;
  /** Encoding of the input string. @defaultValue "utf8" */
  encoding?: "hex" | "utf8";
}

/** Result of a WASM-accelerated hash operation. */
export interface WasmHashResult {
  /** Hex-encoded hash digest. */
  digest: string;
  /** Algorithm used. */
  algorithm: WasmHashAlgorithm;
  /** Backend that performed the operation. */
  backend: WasmBackend;
}

/** Options for WASM-accelerated AEAD encryption. */
export interface WasmAeadEncryptOptions {
  /** 256-bit key (32 bytes), hex or Uint8Array. */
  key: string | Uint8Array;
  /** Plaintext to encrypt. */
  plaintext: string | Uint8Array;
  /** Optional additional authenticated data. */
  aad?: Uint8Array;
}

/** Result of a WASM-accelerated AEAD encryption. */
export interface WasmAeadEncryptResult {
  /** Base64-encoded ciphertext (nonce || ciphertext || tag). */
  ciphertext: string;
  /** Backend that performed the operation. */
  backend: WasmBackend;
}

/** Result of a WASM-accelerated AEAD decryption. */
export interface WasmAeadDecryptResult {
  /** Decrypted plaintext bytes. */
  plaintext: Uint8Array;
  /** Backend that performed the operation. */
  backend: WasmBackend;
}

// --- Detection ---

let cachedBackend: WasmBackend | undefined;

/**
 * Detect the best available WASM backend.
 *
 * Checks (in order):
 * 1. WASM SIMD support (fastest, requires V8 ≥ 91 / Node 16+)
 * 2. Basic WASM support (moderate speedup)
 * 3. Pure JS fallback (always available)
 *
 * @example
 * ```ts
 * const backend = detectWasmBackend();
 * // "wasm-simd" | "wasm" | "js"
 * ```
 */
export function detectWasmBackend(): WasmBackend {
  if (cachedBackend !== undefined) return cachedBackend;

  // Use globalThis to access WebAssembly without compile-time type dependency
  const g = globalThis as Record<string, unknown>;
  const WA = g["WebAssembly"] as
    | { Module: new (bytes: Uint8Array) => unknown }
    | undefined;

  if (!WA) {
    cachedBackend = "js";
    return cachedBackend;
  }

  try {
    // SIMD validation: a minimal WASM module using v128 operations
    const simdTest = new Uint8Array([
      0x00,
      0x61,
      0x73,
      0x6d, // magic
      0x01,
      0x00,
      0x00,
      0x00, // version
      0x01,
      0x05,
      0x01,
      0x60,
      0x00,
      0x01,
      0x7b, // type: () -> v128
      0x03,
      0x02,
      0x01,
      0x00, // function
      0x0a,
      0x0a,
      0x01,
      0x08,
      0x00,
      0xfd,
      0x0c, // code: v128.const
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x0b, // end
    ]);
    const mod = new WA.Module(simdTest);
    if (mod) {
      cachedBackend = "wasm-simd";
      return cachedBackend;
    }
  } catch {
    // SIMD not supported, check basic WASM
    if (typeof WA.Module === "function") {
      cachedBackend = "wasm";
      return cachedBackend;
    }
  }
  cachedBackend = "js";
  return cachedBackend;
}

/**
 * Reset the cached backend detection (for testing).
 * @example
 * ```ts
 * _resetWasmDetection();
 * ```
 */
export function _resetWasmDetection(): void {
  cachedBackend = undefined;
}

// --- Helpers ---

const HEX_RE = /^[0-9a-fA-F]*$/;

function toBytes(
  input: string | Uint8Array,
  encoding: "hex" | "utf8" = "utf8",
): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (encoding === "hex") {
    if (!HEX_RE.test(input)) throw new Error("Invalid hex string");
    return Buffer.from(input, "hex");
  }
  return Buffer.from(input, "utf8");
}

function getHashFn(algorithm: WasmHashAlgorithm) {
  switch (algorithm) {
    case "sha256":
      return sha256;
    case "sha512":
      return sha512;
    case "sha3-256":
      return sha3_256;
    case "sha3-512":
      return sha3_512;
    case "blake3":
      return blake3;
    default:
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  }
}

// --- Hash ---

/**
 * Hash data using the fastest available backend.
 *
 * Currently uses @noble pure-JS implementations. When `awasm-noble` ships,
 * this will transparently upgrade to WASM for 5-10x speedups.
 *
 * @example
 * ```ts
 * const result = wasmHash({ algorithm: "blake3", data: "hello" });
 * console.log(result.digest); // hex-encoded hash
 * console.log(result.backend); // "js" | "wasm" | "wasm-simd"
 * ```
 */
export function wasmHash(options: WasmHashOptions): WasmHashResult {
  const data = toBytes(options.data, options.encoding ?? "utf8");
  const hashFn = getHashFn(options.algorithm);
  const digest = hashFn(data);

  return {
    digest: Buffer.from(digest).toString("hex"),
    algorithm: options.algorithm,
    // Report "js" since we're using noble pure-JS regardless of WASM capability
    // until awasm-noble integration is available
    backend: "js" as WasmBackend,
  };
}

// --- AEAD ---

const NONCE_LENGTH = 24;

/**
 * Encrypt data using XChaCha20-Poly1305 with the fastest available backend.
 *
 * @example
 * ```ts
 * const key = randomBytes(32);
 * const result = wasmAeadEncrypt({ key, plaintext: "secret" });
 * console.log(result.backend); // "js" | "wasm-simd"
 * ```
 */
export function wasmAeadEncrypt(
  options: WasmAeadEncryptOptions,
): WasmAeadEncryptResult {
  const key = toBytes(options.key, "hex");
  if (key.length !== 32) {
    throw new Error(`Key must be 32 bytes (256 bits), got ${key.length}`);
  }

  const plaintext =
    options.plaintext instanceof Uint8Array
      ? options.plaintext
      : Buffer.from(options.plaintext, "utf8");
  const nonce = randomBytes(NONCE_LENGTH);
  const cipher = xchacha20poly1305(key, nonce, options.aad);
  const sealed = cipher.encrypt(plaintext);

  const combined = new Uint8Array(NONCE_LENGTH + sealed.length);
  combined.set(nonce);
  combined.set(sealed, NONCE_LENGTH);

  return {
    ciphertext: Buffer.from(combined).toString("base64"),
    backend: "js",
  };
}

/**
 * Decrypt data using XChaCha20-Poly1305 with the fastest available backend.
 *
 * @example
 * ```ts
 * const result = wasmAeadDecrypt({ key: keyHex, ciphertext: ct });
 * console.log(Buffer.from(result.plaintext).toString("utf8"));
 * ```
 */
export function wasmAeadDecrypt(options: {
  /** 256-bit key (hex or Uint8Array). */
  key: string | Uint8Array;
  /** Base64-encoded ciphertext from wasmAeadEncrypt. */
  ciphertext: string;
  /** Optional AAD (must match encryption). */
  aad?: Uint8Array;
}): WasmAeadDecryptResult {
  const key = toBytes(options.key, "hex");
  if (key.length !== 32) {
    throw new Error(`Key must be 32 bytes (256 bits), got ${key.length}`);
  }

  const combined = Buffer.from(options.ciphertext, "base64");
  if (combined.length < NONCE_LENGTH + 16) {
    throw new Error("Ciphertext too short — missing nonce or auth tag");
  }

  const nonce = combined.subarray(0, NONCE_LENGTH);
  const sealed = combined.subarray(NONCE_LENGTH);
  const cipher = xchacha20poly1305(key, nonce, options.aad);

  return {
    plaintext: cipher.decrypt(sealed),
    backend: "js",
  };
}
