// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { ref, readonly, type Ref, type DeepReadonly } from "vue";
import {
  generateKeyPair,
  type KeyAlgorithm,
  type GeneratedKeyPair,
} from "@sebastienrousseau/crypto-lib";

export interface UseKeypairReturn {
  /** Hex-encoded public key. */
  publicKey: DeepReadonly<Ref<string | null>>;
  /** Hex-encoded private key. */
  privateKey: DeepReadonly<Ref<string | null>>;
  /** Algorithm used for the last generation. */
  algorithm: DeepReadonly<Ref<KeyAlgorithm | null>>;
  /** Whether a key generation is currently in progress. */
  isGenerating: DeepReadonly<Ref<boolean>>;
  /** Error from the last generation attempt, if any. */
  error: DeepReadonly<Ref<Error | null>>;
  /** Generate a new key pair for the given algorithm. */
  generate: (algo: KeyAlgorithm) => Promise<GeneratedKeyPair>;
  /** Clear all reactive state. */
  clear: () => void;
}

/**
 * Vue composable for cryptographic key pair generation.
 *
 * @example
 * ```ts
 * const { publicKey, privateKey, generate, isGenerating } = useKeypair();
 * await generate("ed25519");
 * console.log(publicKey.value);
 * ```
 */
export function useKeypair(): UseKeypairReturn {
  const publicKey = ref<string | null>(null);
  const privateKey = ref<string | null>(null);
  const algorithm = ref<KeyAlgorithm | null>(null);
  const isGenerating = ref(false);
  const error = ref<Error | null>(null);

  async function generate(algo: KeyAlgorithm): Promise<GeneratedKeyPair> {
    isGenerating.value = true;
    error.value = null;

    try {
      const keyPair = generateKeyPair(algo);
      publicKey.value = keyPair.publicKey;
      privateKey.value = keyPair.privateKey;
      algorithm.value = algo;
      return keyPair;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      throw error.value;
    } finally {
      isGenerating.value = false;
    }
  }

  function clear(): void {
    publicKey.value = null;
    privateKey.value = null;
    algorithm.value = null;
    error.value = null;
  }

  return {
    publicKey: readonly(publicKey),
    privateKey: readonly(privateKey),
    algorithm: readonly(algorithm),
    isGenerating: readonly(isGenerating),
    error: readonly(error),
    generate,
    clear,
  };
}
