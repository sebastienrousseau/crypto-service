/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Cryptographic hash functions via @noble/hashes.
 *
 * Supports: SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-512, BLAKE2b, BLAKE3.
 */

import { sha256, sha384, sha512 } from "@noble/hashes/sha2.js";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3.js";
import { blake2b } from "@noble/hashes/blake2.js";
import { blake3 } from "@noble/hashes/blake3.js";

/** Supported cryptographic hash algorithms. */
export const HASH_ALGORITHMS = [
  "sha256",
  "sha384",
  "sha512",
  "sha3-256",
  "sha3-512",
  "blake2b",
  "blake3",
] as const;

/** Union of supported hash algorithm names. */
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

/** Options for computing a cryptographic hash. */
export interface HashOptions {
  /** Algorithm to use. */
  algorithm: HashAlgorithm;
  /** Data to hash (UTF-8 string or bytes). */
  data: string | Uint8Array;
}

/** Result of a cryptographic hash computation. */
export interface HashResult {
  /** Hex-encoded hash digest. */
  digest: string;
  /** Algorithm used. */
  algorithm: HashAlgorithm;
  /** Digest length in bytes. */
  length: number;
}

/** Convert a string or Uint8Array to UTF-8 bytes. */
function toBytes(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) return input;
  return Buffer.from(input, "utf8");
}

/**
 * Compute a cryptographic hash digest.
 */
export function hash(options: HashOptions): HashResult {
  const data = toBytes(options.data);
  let digest: Uint8Array;

  switch (options.algorithm) {
    case "sha256":
      digest = sha256(data);
      break;
    case "sha384":
      digest = sha384(data);
      break;
    case "sha512":
      digest = sha512(data);
      break;
    case "sha3-256":
      digest = sha3_256(data);
      break;
    case "sha3-512":
      digest = sha3_512(data);
      break;
    case "blake2b":
      digest = blake2b(data);
      break;
    case "blake3":
      digest = blake3(data);
      break;
    default:
      throw new Error(
        `Unsupported algorithm: ${options.algorithm as string}. Supported: ${HASH_ALGORITHMS.join(", ")}`,
      );
  }

  return {
    digest: Buffer.from(digest).toString("hex"),
    algorithm: options.algorithm,
    length: digest.length,
  };
}
