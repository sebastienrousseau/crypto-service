// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import {
  generateX25519KeyPair,
  mlKemKeygen,
  streamEncrypt,
  streamDecrypt,
  streamPqEncrypt,
  streamPqDecrypt,
  streamMultiPqEncrypt,
  streamMultiPqDecrypt,
  type MultiPqRecipient,
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
  multiRecipients: MultiPqRecipient[];
  aliceId: string;
  aliceX25519Secret: string;
  aliceMlKemSecret: string;
  multiPqCiphertext64k: Uint8Array;
}

/** Generates 3 recipient keypairs for multi-recipient streaming benchmarks. */
function createMultiRecipients(): {
  recipients: MultiPqRecipient[];
  alice: { id: string; xSec: string; mlSec: string };
} {
  const aliceX = generateX25519KeyPair();
  const aliceMl = mlKemKeygen(768);
  const bobX = generateX25519KeyPair();
  const bobMl = mlKemKeygen(768);
  const charlieX = generateX25519KeyPair();
  const charlieMl = mlKemKeygen(768);

  const recipients: MultiPqRecipient[] = [
    {
      recipientId: "alice@example.com",
      recipientX25519Public: aliceX.publicKey,
      recipientMlKemPublic: aliceMl.publicKey,
    },
    {
      recipientId: "bob@example.com",
      recipientX25519Public: bobX.publicKey,
      recipientMlKemPublic: bobMl.publicKey,
    },
    {
      recipientId: "charlie@example.com",
      recipientX25519Public: charlieX.publicKey,
      recipientMlKemPublic: charlieMl.publicKey,
    },
  ];

  return {
    recipients,
    alice: {
      id: "alice@example.com",
      xSec: aliceX.privateKey,
      mlSec: aliceMl.secretKey,
    },
  };
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

  const { recipients, alice } = createMultiRecipients();
  const multiPqEnc = streamMultiPqEncrypt({
    recipients,
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
    multiRecipients: recipients,
    aliceId: alice.id,
    aliceX25519Secret: alice.xSec,
    aliceMlKemSecret: alice.mlSec,
    multiPqCiphertext64k: multiPqEnc.ciphertext,
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

async function benchmarkMultiPqStreaming(
  ops: StreamingOperations,
  iterations: number,
): Promise<BenchmarkItemResult[]> {
  const encStats = await benchmarkOperation(
    () => {
      streamMultiPqEncrypt({
        recipients: ops.multiRecipients,
        plaintext: ops.payload64k,
      });
    },
    { iterations, warmup: 5 },
  );

  const decStats = await benchmarkOperation(
    () => {
      streamMultiPqDecrypt({
        recipientId: ops.aliceId,
        recipientX25519Secret: ops.aliceX25519Secret,
        recipientMlKemSecret: ops.aliceMlKemSecret,
        ciphertext: ops.multiPqCiphertext64k,
      });
    },
    { iterations, warmup: 5 },
  );

  return [
    {
      name: "Multi-Recipient PQ Stream AEAD Encrypt (3 recipients, 64KB)",
      category: "streaming",
      algorithm: "Multi-X25519+ML-KEM-768",
      operation: "encrypt",
      quantumSafe: true,
      stats: encStats,
    },
    {
      name: "Multi-Recipient PQ Stream AEAD Decrypt (3 recipients, 64KB)",
      category: "streaming",
      algorithm: "Multi-X25519+ML-KEM-768",
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
  const multiPq = await benchmarkMultiPqStreaming(ops, iterations);
  return [...symmetric, ...pq, ...multiPq];
}
