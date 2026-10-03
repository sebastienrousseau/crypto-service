// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { ref, readonly, type Ref, type DeepReadonly } from "vue";
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

/**
 * Reactive state and methods returned by {@link usePqStream}.
 */
export interface UsePqStreamReturn {
  /** The most recent ciphertext (Uint8Array bytes). */
  ciphertext: DeepReadonly<Ref<Uint8Array | null>>;
  /** The most recent decrypted plaintext (Uint8Array bytes). */
  plaintext: DeepReadonly<Ref<Uint8Array | null>>;
  /** Number of chunks processed in the last encryption. */
  chunkCount: DeepReadonly<Ref<number | null>>;
  /** Whether an encrypt/decrypt operation is in progress. */
  isProcessing: DeepReadonly<Ref<boolean>>;
  /** Error from the last operation, if any. */
  error: DeepReadonly<Ref<Error | null>>;
  /** Encrypt plaintext into post-quantum hybrid STREAM AEAD ciphertext bytes. */
  encrypt: (
    data: string | Uint8Array,
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
  /** Reset all reactive state. */
  clear: () => void;
}

function toUint8Array(input: string | Uint8Array): Uint8Array {
  return typeof input === "string" ? new TextEncoder().encode(input) : input;
}

function executePqEncrypt(
  data: string | Uint8Array,
  keys: PqRecipientPublicKeys,
  chunkSize?: number,
): { ciphertext: Uint8Array; chunkCount: number } {
  const rawPt = toUint8Array(data);
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

async function runOp<T>(
  isProcessing: Ref<boolean>,
  error: Ref<Error | null>,
  fn: () => T,
): Promise<T> {
  isProcessing.value = true;
  error.value = null;
  try {
    return fn();
    /* c8 ignore start -- V8 can't track ternary + finally-after-rethrow branches via source maps */
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err));
    throw error.value;
  } finally {
    isProcessing.value = false;
  }
  /* c8 ignore stop */
}

/**
 * Vue composable for post-quantum hybrid streaming AEAD (X25519 + ML-KEM-768 + XChaCha20-Poly1305).
 */
export function usePqStream(): UsePqStreamReturn {
  const ciphertext = ref<Uint8Array | null>(null);
  const plaintext = ref<Uint8Array | null>(null);
  const chunkCount = ref<number | null>(null);
  const isProcessing = ref(false);
  const error = ref<Error | null>(null);

  return {
    ciphertext: readonly(ciphertext),
    plaintext: readonly(plaintext),
    chunkCount: readonly(chunkCount),
    isProcessing: readonly(isProcessing),
    error: readonly(error),
    encrypt: (data, keys, sz) =>
      runOp(isProcessing, error, () => {
        const res = executePqEncrypt(data, keys, sz);
        ciphertext.value = res.ciphertext;
        chunkCount.value = res.chunkCount;
        return res.ciphertext;
      }),
    decrypt: (ct, keys, sz) =>
      runOp(isProcessing, error, () => {
        const res = executePqDecrypt(ct, keys, sz);
        plaintext.value = res;
        return res;
      }),
    createEncryptStream: (keys, sz) =>
      createPqEncryptStream({
        recipientX25519Public: keys.x25519PublicKey,
        recipientMlKemPublic: keys.mlKemPublicKey,
        chunkSize: sz,
      }),
    createDecryptStream: (keys, sz) =>
      createPqDecryptStream({
        recipientX25519Secret: keys.x25519SecretKey,
        recipientMlKemSecret: keys.mlKemSecretKey,
        chunkSize: sz,
      }),
    clear: () => {
      ciphertext.value = null;
      plaintext.value = null;
      chunkCount.value = null;
      error.value = null;
    },
  };
}
