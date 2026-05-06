/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Cryptographic hash functions via @noble/hashes.
 *
 * Supports: SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-512, BLAKE2b, BLAKE3.
 */

import { sha256 } from "@noble/hashes/sha256";
import { sha384, sha512 } from "@noble/hashes/sha512";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3";
import { blake2b } from "@noble/hashes/blake2b";
import { blake3 } from "@noble/hashes/blake3";

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

function toBytes(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) return input;
  return Buffer.from(input, "utf8");
}

const hashFunctions: Record<HashAlgorithm, (data: Uint8Array) => Uint8Array> = {
  sha256: (d) => sha256(d),
  sha384: (d) => sha384(d),
  sha512: (d) => sha512(d),
  "sha3-256": (d) => sha3_256(d),
  "sha3-512": (d) => sha3_512(d),
  blake2b: (d) => blake2b(d),
  blake3: (d) => blake3(d),
};

/* c8 ignore start -- V8 phantom branch at JSDoc + unreachable !fn guard */
/**
 * Compute a cryptographic hash digest.
 */
export function hash(options: HashOptions): HashResult {
  const fn = hashFunctions[options.algorithm];
  if (!fn) {
    throw new Error(
      `Unsupported algorithm: ${options.algorithm}. Supported: ${HASH_ALGORITHMS.join(", ")}`,
    );
  }
  /* c8 ignore stop */

  const data = toBytes(options.data);
  const digest = fn(data);

  return {
    digest: Buffer.from(digest).toString("hex"),
    algorithm: options.algorithm,
    length: digest.length,
  };
}
