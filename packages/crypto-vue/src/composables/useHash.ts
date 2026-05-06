// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { ref, readonly, type Ref, type DeepReadonly } from "vue";
import { crypto, type HashAlgorithm } from "@sebastienrousseau/crypto-lib";

/** Re-export HashAlgorithm for consumer convenience. */
export type { HashAlgorithm } from "@sebastienrousseau/crypto-lib";

export interface UseHashReturn {
  /** The most recent hash digest (hex-encoded). */
  digest: DeepReadonly<Ref<string | null>>;
  /** The algorithm used for the last hash. */
  algorithm: DeepReadonly<Ref<HashAlgorithm | null>>;
  /** Whether a hash operation is in progress. */
  isHashing: DeepReadonly<Ref<boolean>>;
  /** Error from the last hash attempt, if any. */
  error: DeepReadonly<Ref<Error | null>>;
  /** Hash data with the specified algorithm. */
  hash: (algo: HashAlgorithm, data: string | Uint8Array) => Promise<string>;
  /** Clear all reactive state. */
  clear: () => void;
}

/**
 * Vue composable for cryptographic hashing.
 *
 * Supports all algorithms from crypto-lib: sha256, sha384, sha512,
 * sha3-256, sha3-512, blake2b, blake3.
 *
 * @example
 * ```ts
 * const { hash, digest, algorithm } = useHash();
 * await hash("sha3-256", "hello world");
 * console.log(digest.value);
 * ```
 */
export function useHash(): UseHashReturn {
  const digest = ref<string | null>(null);
  const algorithm = ref<HashAlgorithm | null>(null);
  const isHashing = ref(false);
  const error = ref<Error | null>(null);

  async function hash(
    algo: HashAlgorithm,
    data: string | Uint8Array,
  ): Promise<string> {
    isHashing.value = true;
    error.value = null;

    try {
      const result = crypto.hash(algo, data);
      digest.value = result;
      algorithm.value = algo;
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      throw error.value;
    } finally {
      isHashing.value = false;
    }
  }

  function clear(): void {
    digest.value = null;
    algorithm.value = null;
    error.value = null;
  }

  return {
    digest: readonly(digest),
    algorithm: readonly(algorithm),
    isHashing: readonly(isHashing),
    error: readonly(error),
    hash,
    clear,
  };
}
