/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Key derivation functions via @noble/hashes.
 *
 * Supports: scrypt, HKDF-SHA256, PBKDF2-SHA256.
 * Argon2 is not yet available in @noble/hashes — scrypt is the recommended
 * alternative for password hashing.
 */

import { scrypt } from "@noble/hashes/scrypt.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/ciphers/utils.js";

/** Supported key derivation function algorithms. */
export const KDF_ALGORITHMS = [
  "scrypt",
  "hkdf-sha256",
  "pbkdf2-sha256",
] as const;
/** Union of supported KDF algorithm names. */
export type KdfAlgorithm = (typeof KDF_ALGORITHMS)[number];

/** Options for deriving a key using a KDF. */
export interface KdfDeriveOptions {
  /** Algorithm to use. */
  algorithm: KdfAlgorithm;
  /** Input keying material (password or key). */
  password: string | Uint8Array;
  /** Salt (hex string or bytes). If omitted, a random 16-byte salt is generated. */
  salt?: string | Uint8Array;
  /** Desired output key length in bytes (default: 32). */
  keyLength?: number;
  /** Algorithm-specific parameters. */
  params?: {
    /** scrypt: CPU/memory cost (default: 2^17 = 131072). */
    N?: number;
    /** scrypt: block size (default: 8). */
    r?: number;
    /** scrypt: parallelism (default: 1). */
    p?: number;
    /** PBKDF2: iteration count (default: 600000). */
    iterations?: number;
    /** HKDF: info context (default: empty). */
    info?: string | Uint8Array;
  };
}

/** Result of a KDF key derivation. */
export interface KdfResult {
  /** Hex-encoded derived key. */
  derivedKey: string;
  /** Hex-encoded salt used (important to store for verification). */
  salt: string;
  /** Algorithm used. */
  algorithm: KdfAlgorithm;
  /** Key length in bytes. */
  keyLength: number;
}

/** Regex matching valid hexadecimal strings. */
const HEX_RE = /^[0-9a-fA-F]*$/;

/** Convert a string or Uint8Array to bytes using the specified encoding. */
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
 * Derive a cryptographic key from a password or input keying material.
 */
export function kdfDerive(options: KdfDeriveOptions): KdfResult {
  const password = toBytes(options.password, "utf8");
  const salt = options.salt ? toBytes(options.salt, "hex") : randomBytes(16);
  const keyLength = options.keyLength ?? 32;
  const params = options.params ?? {};

  let derived: Uint8Array;

  switch (options.algorithm) {
    case "scrypt": {
      const N = params.N ?? 131072;
      const r = params.r ?? 8;
      const p = params.p ?? 1;
      derived = scrypt(password, salt, { N, r, p, dkLen: keyLength });
      break;
    }
    case "hkdf-sha256": {
      const info = params.info ? toBytes(params.info, "utf8") : undefined;
      derived = hkdf(sha256, password, salt, info, keyLength);
      break;
    }
    case "pbkdf2-sha256": {
      const iterations = params.iterations ?? 600000;
      derived = pbkdf2(sha256, password, salt, {
        c: iterations,
        dkLen: keyLength,
      });
      break;
    }
    default:
      throw new Error(`Unsupported KDF algorithm: ${options.algorithm}`);
  }

  return {
    derivedKey: Buffer.from(derived).toString("hex"),
    salt: Buffer.from(salt).toString("hex"),
    algorithm: options.algorithm,
    keyLength,
  };
}
