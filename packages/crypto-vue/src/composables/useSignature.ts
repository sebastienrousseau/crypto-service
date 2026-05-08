// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { ref, readonly, type Ref, type DeepReadonly } from "vue";
import {
  crypto,
  type SignAlgorithm as _SignAlgorithm,
} from "@sebastienrousseau/crypto-lib";

/**
 * Supported digital signature algorithm names (re-exported from crypto-lib).
 *
 * @example
 * ```ts
 * import type { SignAlgorithm } from "@sebastienrousseau/crypto-vue";
 * const algo: SignAlgorithm = "ed25519";
 * ```
 */
export type SignAlgorithm = _SignAlgorithm;

/**
 * Reactive state and methods returned by {@link useSignature}.
 *
 * @example
 * ```ts
 * const state: UseSignatureReturn = useSignature();
 * await state.sign("ed25519", privateKeyHex, "msg");
 * console.log(state.signature.value);
 * ```
 */
export interface UseSignatureReturn {
  /** The most recent signature (hex-encoded). */
  signature: DeepReadonly<Ref<string | null>>;
  /** Result of the most recent verification. */
  isValid: DeepReadonly<Ref<boolean | null>>;
  /** The signing algorithm used for the last operation. */
  algorithm: DeepReadonly<Ref<SignAlgorithm | null>>;
  /** Whether a sign/verify operation is in progress. */
  isProcessing: DeepReadonly<Ref<boolean>>;
  /** Error from the last operation, if any. */
  error: DeepReadonly<Ref<Error | null>>;
  /** Sign a message with the given algorithm and private key. */
  sign: (
    algo: SignAlgorithm,
    privateKeyHex: string,
    message: string | Uint8Array,
  ) => Promise<string>;
  /** Verify a signature with the given algorithm and public key. */
  verify: (
    algo: SignAlgorithm,
    publicKeyHex: string,
    message: string | Uint8Array,
    signatureHex: string,
  ) => Promise<boolean>;
  /** Clear all reactive state. */
  clear: () => void;
}

/**
 * Vue composable for digital signature creation and verification.
 *
 * Supports all signing algorithms from crypto-lib: ed25519, ed448,
 * ecdsa-p256, ecdsa-p384, schnorr, ml-dsa-44, ml-dsa-65, ml-dsa-87.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { sign, verify, signature, isValid } = useSignature();
 * await sign("ed25519", privateKeyHex, "msg");
 * await verify("ed25519", publicKeyHex, "msg", signature.value!);
 * </script>
 * ```
 */
export function useSignature(): UseSignatureReturn {
  const signature = ref<string | null>(null);
  const isValid = ref<boolean | null>(null);
  const algorithm = ref<SignAlgorithm | null>(null);
  const isProcessing = ref(false);
  const error = ref<Error | null>(null);

  async function sign(
    algo: SignAlgorithm,
    privateKeyHex: string,
    message: string | Uint8Array,
  ): Promise<string> {
    isProcessing.value = true;
    error.value = null;

    try {
      const sig = crypto.sign(algo, privateKeyHex, message);
      signature.value = sig;
      algorithm.value = algo;
      return sig;
      /* c8 ignore start -- V8 can't track ternary + finally-after-rethrow branches via source maps */
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      throw error.value;
    } finally {
      isProcessing.value = false;
    }
    /* c8 ignore stop */
  }

  async function verify(
    algo: SignAlgorithm,
    publicKeyHex: string,
    message: string | Uint8Array,
    signatureHex: string,
  ): Promise<boolean> {
    isProcessing.value = true;
    error.value = null;

    try {
      const valid = crypto.verify(algo, publicKeyHex, message, signatureHex);
      isValid.value = valid;
      algorithm.value = algo;
      return valid;
      /* c8 ignore start -- V8 can't track ternary + finally-after-rethrow branches via source maps */
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      throw error.value;
    } finally {
      isProcessing.value = false;
    }
    /* c8 ignore stop */
  }

  function clear(): void {
    signature.value = null;
    isValid.value = null;
    algorithm.value = null;
    error.value = null;
  }

  return {
    signature: readonly(signature),
    isValid: readonly(isValid),
    algorithm: readonly(algorithm),
    isProcessing: readonly(isProcessing),
    error: readonly(error),
    sign,
    verify,
    clear,
  };
}
