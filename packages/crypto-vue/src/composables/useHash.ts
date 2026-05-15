// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { ref, readonly, type Ref, type DeepReadonly } from "vue";
import {
  crypto,
  type HashAlgorithm as _HashAlgorithm,
} from "@sebastienrousseau/crypto-lib";

/**
 * Supported hash algorithm names (re-exported from crypto-lib).
 *
 * @example
 * ```ts
 * import type { HashAlgorithm } from "@sebastienrousseau/crypto-vue";
 * const algo: HashAlgorithm = "sha3-256";
 * ```
 */
export type HashAlgorithm = _HashAlgorithm;

/**
 * Reactive state and methods returned by {@link useHash}.
 *
 * @example
 * ```ts
 * const state: UseHashReturn = useHash();
 * await state.hash("sha256", "data");
 * console.log(state.digest.value);
 * ```
 */
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
 * ```vue
 * <script setup lang="ts">
 * const { hash, digest } = useHash();
 * await hash("sha3-256", "hello world");
 * </script>
 * ```
 */
export function useHash(): UseHashReturn {
  const digest = ref<string | null>(null);
  const algorithm = ref<HashAlgorithm | null>(null);
  const isHashing = ref(false);
  const error = ref<Error | null>(null);

  /** Compute a cryptographic hash digest and update reactive state. */
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
      /* c8 ignore start -- V8 can't track ternary + finally-after-rethrow branches via source maps */
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      throw error.value;
    } finally {
      isHashing.value = false;
    }
    /* c8 ignore stop */
  }

  /** Reset all reactive state to initial values. */
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
