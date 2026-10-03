// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { useState, useCallback } from "react";
import {
  streamPqEncrypt,
  streamPqDecrypt,
  createPqEncryptStream,
  createPqDecryptStream,
  type CryptoTransformStream,
} from "@sebastienrousseau/crypto-lib/streaming";

/** Recipient public keys for post-quantum hybrid streaming encryption. */
export interface PqRecipientPublicKeys {
  /** Recipient X25519 public key (32 bytes; hex string or Uint8Array). */
  x25519PublicKey: string | Uint8Array;
  /** Recipient ML-KEM-768 public key (1184 bytes; hex string or Uint8Array). */
  mlKemPublicKey: string | Uint8Array;
}

/** Recipient secret keys for post-quantum hybrid streaming decryption. */
export interface PqRecipientSecretKeys {
  /** Recipient X25519 secret key (32 bytes; hex string or Uint8Array). */
  x25519SecretKey: string | Uint8Array;
  /** Recipient ML-KEM-768 secret key (2400 bytes; hex string or Uint8Array). */
  mlKemSecretKey: string | Uint8Array;
}

/** Return type of the {@link usePqStream} hook. */
export interface UsePqStreamResult {
  /** Encrypt plaintext into post-quantum hybrid STREAM AEAD ciphertext bytes. */
  encrypt: (
    plaintext: string | Uint8Array,
    keys: PqRecipientPublicKeys,
    chunkSize?: number,
  ) => Promise<Uint8Array>;
  /** Decrypt post-quantum hybrid STREAM AEAD ciphertext bytes into plaintext. */
  decrypt: (
    ciphertext: Uint8Array,
    keys: PqRecipientSecretKeys,
    chunkSize?: number,
  ) => Promise<Uint8Array>;
  /** Create a WHATWG TransformStream that encrypts chunks with PQ hybrid STREAM AEAD. */
  createEncryptStream: (
    keys: PqRecipientPublicKeys,
    chunkSize?: number,
  ) => CryptoTransformStream<Uint8Array, Uint8Array>;
  /** Create a WHATWG TransformStream that decrypts PQ hybrid STREAM AEAD chunks. */
  createDecryptStream: (
    keys: PqRecipientSecretKeys,
    chunkSize?: number,
  ) => CryptoTransformStream<Uint8Array, Uint8Array>;
  /** The last ciphertext produced by `encrypt()`. */
  ciphertext: Uint8Array | null;
  /** The last plaintext produced by `decrypt()`. */
  plaintext: Uint8Array | null;
  /** The chunk count from the last `encrypt()` call. */
  chunkCount: number | null;
  /** True while an encrypt or decrypt operation is in progress. */
  isProcessing: boolean;
  /** Reset all hook state. */
  clear: () => void;
}

function toUint8Array(input: string | Uint8Array): Uint8Array {
  return typeof input === "string" ? new TextEncoder().encode(input) : input;
}

function executePqEncrypt(
  pt: string | Uint8Array,
  keys: PqRecipientPublicKeys,
  chunkSize?: number,
): { ciphertext: Uint8Array; chunkCount: number } {
  const rawPt = toUint8Array(pt);
  const res = streamPqEncrypt({
    recipientX25519Public: keys.x25519PublicKey,
    recipientMlKemPublic: keys.mlKemPublicKey,
    plaintext: rawPt,
    chunkSize,
  });
  const sz = chunkSize ?? 65536;
  const chunkCount = Math.max(1, Math.ceil(rawPt.length / sz));
  return { ciphertext: res.ciphertext, chunkCount };
}

function executePqDecrypt(
  ct: Uint8Array,
  keys: PqRecipientSecretKeys,
  chunkSize?: number,
): Uint8Array {
  return streamPqDecrypt({
    recipientX25519Secret: keys.x25519SecretKey,
    recipientMlKemSecret: keys.mlKemSecretKey,
    ciphertext: ct,
    chunkSize,
  });
}

/**
 * React hook for post-quantum hybrid streaming AEAD (X25519 + ML-KEM-768 + XChaCha20-Poly1305).
 */
export function usePqStream(): UsePqStreamResult {
  const [ciphertext, setCiphertext] = useState<Uint8Array | null>(null);
  const [plaintext, setPlaintext] = useState<Uint8Array | null>(null);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const encrypt = useCallback(
    async (
      pt: string | Uint8Array,
      keys: PqRecipientPublicKeys,
      sz?: number,
    ) => {
      setIsProcessing(true);
      try {
        const res = executePqEncrypt(pt, keys, sz);
        setCiphertext(res.ciphertext);
        setChunkCount(res.chunkCount);
        return res.ciphertext;
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const decrypt = useCallback(
    async (ct: Uint8Array, keys: PqRecipientSecretKeys, sz?: number) => {
      setIsProcessing(true);
      try {
        const res = executePqDecrypt(ct, keys, sz);
        setPlaintext(res);
        return res;
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  return {
    encrypt,
    decrypt,
    createEncryptStream: (k, sz) =>
      createPqEncryptStream({
        recipientX25519Public: k.x25519PublicKey,
        recipientMlKemPublic: k.mlKemPublicKey,
        chunkSize: sz,
      }),
    createDecryptStream: (k, sz) =>
      createPqDecryptStream({
        recipientX25519Secret: k.x25519SecretKey,
        recipientMlKemSecret: k.mlKemSecretKey,
        chunkSize: sz,
      }),
    ciphertext,
    plaintext,
    chunkCount,
    isProcessing,
    clear: () => {
      setCiphertext(null);
      setPlaintext(null);
      setChunkCount(null);
    },
  };
}
