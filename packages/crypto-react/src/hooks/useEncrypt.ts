// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { useState, useCallback } from "react";
import {
  seal,
  open,
} from "@sebastienrousseau/crypto-lib/dist/high-level/secretbox";
import { useCryptoContext } from "../provider";

export interface UseEncryptResult {
  /** Encrypt plaintext. Returns the base64-encoded sealed box. */
  encrypt: (plaintext: string | Uint8Array, key?: string) => string;
  /** Decrypt a sealed box. Returns the plaintext as a UTF-8 string. */
  decrypt: (ciphertext: string, key?: string) => string;
  /** The last ciphertext produced by `encrypt()`. */
  ciphertext: string | null;
  /** The last plaintext produced by `decrypt()`. */
  plaintext: string | null;
  /** True while an encrypt or decrypt operation is in progress. */
  isProcessing: boolean;
}

/**
 * React hook for symmetric authenticated encryption (XChaCha20-Poly1305 secretbox).
 *
 * Uses the `defaultKey` from `CryptoProvider` when no key argument is given.
 */
export function useEncrypt(): UseEncryptResult {
  const { defaultKey } = useCryptoContext();
  const [ciphertext, setCiphertext] = useState<string | null>(null);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const encrypt = useCallback(
    (pt: string | Uint8Array, key?: string): string => {
      const k = key ?? defaultKey;
      if (!k) {
        throw new Error(
          "No encryption key provided. Pass a key argument or set defaultKey via CryptoProvider.",
        );
      }
      setIsProcessing(true);
      try {
        const result = seal(k, pt);
        setCiphertext(result.sealed);
        return result.sealed;
      } finally {
        setIsProcessing(false);
      }
    },
    [defaultKey],
  );

  const decrypt = useCallback(
    (ct: string, key?: string): string => {
      const k = key ?? defaultKey;
      if (!k) {
        throw new Error(
          "No decryption key provided. Pass a key argument or set defaultKey via CryptoProvider.",
        );
      }
      setIsProcessing(true);
      try {
        const raw = open(k, ct);
        const text = Buffer.from(raw).toString("utf8");
        setPlaintext(text);
        return text;
      } finally {
        setIsProcessing(false);
      }
    },
    [defaultKey],
  );

  return { encrypt, decrypt, ciphertext, plaintext, isProcessing };
}
