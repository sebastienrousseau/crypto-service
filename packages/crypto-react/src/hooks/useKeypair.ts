// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { useState, useCallback } from "react";
import {
  generateKeyPair,
  type KeyAlgorithm,
} from "@sebastienrousseau/crypto-lib/dist/keys/keygen";

/**
 * Return type of the {@link useKeypair} hook.
 *
 * @example
 * ```tsx
 * const { publicKey, privateKey, generate, isGenerating }: UseKeypairResult = useKeypair();
 * ```
 */
export interface UseKeypairResult {
  /** Hex-encoded public key, or null before generation. */
  publicKey: string | null;
  /** Hex-encoded private key, or null before generation. */
  privateKey: string | null;
  /** Algorithm used for the last generated pair. */
  algorithm: string | null;
  /** Generate a new key pair (optionally override the default algorithm). */
  generate: (algorithm?: KeyAlgorithm) => void;
  /** True while a key pair is being generated. */
  isGenerating: boolean;
}

/**
 * React hook for generating cryptographic key pairs.
 *
 * @param defaultAlgorithm - Algorithm to use when none is passed to `generate()`. Defaults to `"ed25519"`.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { publicKey, generate, isGenerating } = useKeypair();
 *   return <button onClick={() => generate("x25519")}>{publicKey ?? "Generate"}</button>;
 * }
 * ```
 */
export function useKeypair(
  defaultAlgorithm: KeyAlgorithm = "ed25519",
): UseKeypairResult {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [algorithm, setAlgorithm] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    (algo: KeyAlgorithm = defaultAlgorithm) => {
      setIsGenerating(true);
      try {
        const kp = generateKeyPair(algo);
        setPublicKey(kp.publicKey);
        setPrivateKey(kp.privateKey);
        setAlgorithm(kp.algorithm);
      } finally {
        setIsGenerating(false);
      }
    },
    [defaultAlgorithm],
  );

  return { publicKey, privateKey, algorithm, generate, isGenerating };
}
