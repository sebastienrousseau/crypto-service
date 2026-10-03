// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import {
  generateX25519KeyPair,
  mlKemKeygen,
  streamEncrypt,
  streamDecrypt,
  streamPqEncrypt,
  streamPqDecrypt,
} from "@sebastienrousseau/crypto-lib";
import { BenchmarkItemResult } from "../types";
import { benchmarkOperation } from "../timer";

/** Pre-keyed streaming operations and test vectors for benchmarking. */
export interface StreamingOperations {
  payload64k: Uint8Array;
  symmetricKey: Uint8Array;
  symmetricCiphertext64k: Uint8Array;
  x25519Public: string;
  x25519Secret: string;
  mlKemPublic: string;
  mlKemSecret: string;
  pqCiphertext64k: Uint8Array;
}

/**
 * Initializes keys, random test payloads, and pre-computed ciphertexts
 * outside of the timed benchmark loop.
 */
export function createStreamingOperations(): StreamingOperations {
  const payload64k = crypto.randomBytes(64 * 1024);
  const symmetricKey = crypto.randomBytes(32);
  const symEnc = streamEncrypt({ key: symmetricKey, plaintext: payload64k });

  const x25519 = generateX25519KeyPair();
  const mlkem = mlKemKeygen(768);
  const pqEnc = streamPqEncrypt({
    recipientX25519Public: x25519.publicKey,
    recipientMlKemPublic: mlkem.publicKey,
    plaintext: payload64k,
  });

  return {
    payload64k,
    symmetricKey,
    symmetricCiphertext64k: symEnc.ciphertext,
    x25519Public: x25519.publicKey,
    x25519Secret: x25519.privateKey,
    mlKemPublic: mlkem.publicKey,
    mlKemSecret: mlkem.secretKey,
    pqCiphertext64k: pqEnc.ciphertext,
  };
}

async function benchmarkSymmetricStreaming(
  ops: StreamingOperations,
  iterations: number,
): Promise<BenchmarkItemResult[]> {
  const encStats = await benchmarkOperation(
    () => {
      streamEncrypt({ key: ops.symmetricKey, plaintext: ops.payload64k });
    },
    { iterations, warmup: 5 },
  );

  const decStats = await benchmarkOperation(
    () => {
      streamDecrypt({
        key: ops.symmetricKey,
        ciphertext: ops.symmetricCiphertext64k,
      });
    },
    { iterations, warmup: 5 },
  );

  return [
    {
      name: "Symmetric Stream AEAD Encrypt (64KB)",
      category: "streaming",
      algorithm: "XChaCha20-Poly1305",
      operation: "encrypt",
      quantumSafe: true,
      stats: encStats,
    },
    {
      name: "Symmetric Stream AEAD Decrypt (64KB)",
      category: "streaming",
      algorithm: "XChaCha20-Poly1305",
      operation: "decrypt",
      quantumSafe: true,
      stats: decStats,
    },
  ];
}

async function benchmarkPqStreaming(
  ops: StreamingOperations,
  iterations: number,
): Promise<BenchmarkItemResult[]> {
  const encStats = await benchmarkOperation(
    () => {
      streamPqEncrypt({
        recipientX25519Public: ops.x25519Public,
        recipientMlKemPublic: ops.mlKemPublic,
        plaintext: ops.payload64k,
      });
    },
    { iterations, warmup: 5 },
  );

  const decStats = await benchmarkOperation(
    () => {
      streamPqDecrypt({
        recipientX25519Secret: ops.x25519Secret,
        recipientMlKemSecret: ops.mlKemSecret,
        ciphertext: ops.pqCiphertext64k,
      });
    },
    { iterations, warmup: 5 },
  );

  return [
    {
      name: "Post-Quantum Stream AEAD Encrypt (64KB)",
      category: "streaming",
      algorithm: "X25519+ML-KEM-768",
      operation: "encrypt",
      quantumSafe: true,
      stats: encStats,
    },
    {
      name: "Post-Quantum Stream AEAD Decrypt (64KB)",
      category: "streaming",
      algorithm: "X25519+ML-KEM-768",
      operation: "decrypt",
      quantumSafe: true,
      stats: decStats,
    },
  ];
}

/**
 * Benchmarks symmetric STREAM AEAD against post-quantum hybrid STREAM AEAD
 * across encryption and decryption operations.
 */
export async function runStreamingBenchmarks(
  iterations = 30,
): Promise<BenchmarkItemResult[]> {
  const ops = createStreamingOperations();
  const symmetric = await benchmarkSymmetricStreaming(ops, iterations);
  const pq = await benchmarkPqStreaming(ops, iterations);
  return [...symmetric, ...pq];
}
