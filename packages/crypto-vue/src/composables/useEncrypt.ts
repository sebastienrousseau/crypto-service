// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { ref, readonly, inject, type Ref, type DeepReadonly } from "vue";
import { crypto } from "@sebastienrousseau/crypto-lib";
import { CryptoSymbol, type CryptoPluginOptions } from "../plugin";

/**
 * Reactive state and methods returned by {@link useEncrypt}.
 *
 * @example
 * ```ts
 * const state: UseEncryptReturn = useEncrypt();
 * const key = state.randomKey();
 * await state.encrypt(key, "hello");
 * ```
 */
export interface UseEncryptReturn {
  /** The most recent ciphertext (hex-encoded). */
  ciphertext: DeepReadonly<Ref<string | null>>;
  /** The most recent decrypted plaintext (as UTF-8 string). */
  plaintext: DeepReadonly<Ref<string | null>>;
  /** Whether an encrypt/decrypt operation is in progress. */
  isProcessing: DeepReadonly<Ref<boolean>>;
  /** Error from the last operation, if any. */
  error: DeepReadonly<Ref<Error | null>>;
  /** Encrypt plaintext with the given key. */
  encrypt: (key: string, data: string | Uint8Array) => Promise<string>;
  /** Decrypt ciphertext with the given key. */
  decrypt: (key: string, data: string) => Promise<Uint8Array>;
  /** Generate a random 256-bit key (hex string). */
  randomKey: () => string;
  /** Clear all reactive state. */
  clear: () => void;
}

/**
 * Vue composable for symmetric encryption/decryption using
 * secretbox (XChaCha20-Poly1305).
 *
 * If the CryptoPlugin has been installed with a `defaultKey`, that key
 * is used when none is passed explicitly.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { encrypt, randomKey, ciphertext } = useEncrypt();
 * const key = randomKey();
 * await encrypt(key, "secret message");
 * </script>
 * ```
 */
export function useEncrypt(): UseEncryptReturn {
  const opts = inject<CryptoPluginOptions>(CryptoSymbol, {});

  const ciphertext = ref<string | null>(null);
  const plaintext = ref<string | null>(null);
  const isProcessing = ref(false);
  const error = ref<Error | null>(null);

  /** Resolve the encryption key from the argument or plugin defaults. */
  function resolveKey(key?: string): string {
    const resolved = key ?? opts.defaultKey;
    if (!resolved) {
      throw new Error(
        "No encryption key provided and no defaultKey configured in CryptoPlugin.",
      );
    }
    return resolved;
  }

  /** Encrypt plaintext using secretbox and update reactive state. */
  async function encrypt(
    key: string,
    data: string | Uint8Array,
  ): Promise<string> {
    isProcessing.value = true;
    error.value = null;

    try {
      const k = resolveKey(key);
      const ct = crypto.encrypt(k, data);
      ciphertext.value = ct;
      return ct;
      /* c8 ignore start -- V8 can't track ternary + finally-after-rethrow branches via source maps */
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      throw error.value;
    } finally {
      isProcessing.value = false;
    }
    /* c8 ignore stop */
  }

  /** Decrypt ciphertext using secretbox and update reactive state. */
  async function decrypt(key: string, data: string): Promise<Uint8Array> {
    isProcessing.value = true;
    error.value = null;

    try {
      const k = resolveKey(key);
      const pt = crypto.decrypt(k, data);
      plaintext.value = new TextDecoder().decode(pt);
      return pt;
      /* c8 ignore start -- V8 can't track ternary + finally-after-rethrow branches via source maps */
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      throw error.value;
    } finally {
      isProcessing.value = false;
    }
    /* c8 ignore stop */
  }

  /** Generate a random 256-bit encryption key as a hex string. */
  function randomKey(): string {
    return crypto.randomKey();
  }

  /** Reset all reactive state to initial values. */
  function clear(): void {
    ciphertext.value = null;
    plaintext.value = null;
    error.value = null;
  }

  return {
    ciphertext: readonly(ciphertext),
    plaintext: readonly(plaintext),
    isProcessing: readonly(isProcessing),
    error: readonly(error),
    encrypt,
    decrypt,
    randomKey,
    clear,
  };
}
