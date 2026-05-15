/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Streaming hash — incremental hashing for arbitrarily large inputs.
 *
 * Uses the .create() factory from @noble/hashes so data is processed
 * chunk-by-chunk without accumulating the entire input in memory.
 */

import { sha256, sha384, sha512 } from "@noble/hashes/sha2.js";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3.js";
import { blake2b } from "@noble/hashes/blake2.js";
import { blake3 } from "@noble/hashes/blake3.js";

/** Supported streaming hash algorithm identifiers. */
export const STREAM_HASH_ALGORITHMS = [
  "sha256",
  "sha384",
  "sha512",
  "sha3-256",
  "sha3-512",
  "blake2b",
  "blake3",
] as const;
/** Union type of supported streaming hash algorithm names. */
export type StreamHashAlgorithm = (typeof STREAM_HASH_ALGORITHMS)[number];

interface HashLike {
  update(data: Uint8Array): HashLike;
  digest(): Uint8Array;
}

const factories: Record<StreamHashAlgorithm, () => HashLike> = {
  sha256: () => sha256.create(),
  sha384: () => sha384.create(),
  sha512: () => sha512.create(),
  "sha3-256": () => sha3_256.create(),
  "sha3-512": () => sha3_512.create(),
  blake2b: () => blake2b.create(),
  blake3: () => blake3.create(),
};

/** Incremental hasher that processes data in chunks and produces a digest. */
export interface StreamingHasher {
  /** Feed data into the hash. Can be called multiple times. */
  update(data: string | Uint8Array): StreamingHasher;
  /** Finalize and return the hex-encoded digest. */
  digest(): string;
  /** Finalize and return the raw digest bytes. */
  digestBytes(): Uint8Array;
}

/**
 * Create an incremental hasher for the given algorithm.
 *
 * ```ts
 * const h = createHasher('sha256');
 * h.update(chunk1);
 * h.update(chunk2);
 * const digest = h.digest(); // hex string
 * ```
 */
export function createHasher(algorithm: StreamHashAlgorithm): StreamingHasher {
  const factory = factories[algorithm];
  if (!factory) {
    throw new Error(`Unsupported streaming hash algorithm: ${algorithm}`);
  }
  const inner = factory();
  let finalized = false;

  return {
    update(data: string | Uint8Array) {
      if (finalized) throw new Error("Hasher already finalized");
      const bytes = typeof data === "string" ? Buffer.from(data, "utf8") : data;
      inner.update(bytes);
      return this;
    },
    digest() {
      finalized = true;
      return Buffer.from(inner.digest()).toString("hex");
    },
    digestBytes() {
      finalized = true;
      return inner.digest();
    },
  };
}
