// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { useState, useCallback } from "react";
import {
  crypto,
  type SignAlgorithm,
} from "@sebastienrousseau/crypto-lib/dist/crypto";

export interface UseSignatureResult {
  /** Sign a message. Returns the hex-encoded signature. */
  sign: (
    privateKey: string,
    message: string | Uint8Array,
    algorithm?: SignAlgorithm,
  ) => string;
  /** Verify a signature. Returns true if valid. */
  verify: (
    publicKey: string,
    message: string | Uint8Array,
    signature: string,
    algorithm?: SignAlgorithm,
  ) => boolean;
  /** The last produced hex-encoded signature. */
  signature: string | null;
  /** The result of the last `verify()` call. */
  isValid: boolean | null;
  /** True while a sign or verify operation is in progress. */
  isProcessing: boolean;
}

/**
 * React hook for digital signatures (sign and verify).
 *
 * @param defaultAlgorithm - Signing algorithm when none is passed. Defaults to `"ed25519"`.
 */
export function useSignature(
  defaultAlgorithm: SignAlgorithm = "ed25519",
): UseSignatureResult {
  const [signature, setSignature] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const sign = useCallback(
    (
      privateKey: string,
      message: string | Uint8Array,
      algorithm?: SignAlgorithm,
    ): string => {
      setIsProcessing(true);
      try {
        const sig = crypto.sign(
          algorithm ?? defaultAlgorithm,
          privateKey,
          message,
        );
        setSignature(sig);
        return sig;
      } finally {
        setIsProcessing(false);
      }
    },
    [defaultAlgorithm],
  );

  const verify = useCallback(
    (
      publicKey: string,
      message: string | Uint8Array,
      sig: string,
      algorithm?: SignAlgorithm,
    ): boolean => {
      setIsProcessing(true);
      try {
        const valid = crypto.verify(
          algorithm ?? defaultAlgorithm,
          publicKey,
          message,
          sig,
        );
        setIsValid(valid);
        return valid;
      } finally {
        setIsProcessing(false);
      }
    },
    [defaultAlgorithm],
  );

  return { sign, verify, signature, isValid, isProcessing };
}
