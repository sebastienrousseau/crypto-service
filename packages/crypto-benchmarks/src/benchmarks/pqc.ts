// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import {
  mlKemKeygen,
  mlKemEncap,
  mlDsaKeygen,
  mlDsaSign,
  mlDsaVerify,
} from "@sebastienrousseau/crypto-lib";
import type {
  MlKemEncapResult,
  MlDsaVerifyResult,
} from "@sebastienrousseau/crypto-lib";
import { BenchmarkItemResult } from "../types";
import { benchmarkOperation } from "../timer";

/** Pre-keyed post-quantum operations, as timed by {@link runPqcBenchmarks}. */
export interface PqcOperations {
  /** One ML-KEM-768 encapsulation to a fixed public key (crypto-lib). */
  mlKem768Encapsulate: () => MlKemEncapResult;
  /** Hex secret key matching the encapsulation public key. */
  mlKem768SecretKey: string;
  /** One ML-DSA-65 verification of a fixed, valid signature (crypto-lib). */
  mlDsa65Verify: () => MlDsaVerifyResult;
}

/**
 * Generates keys and returns the crypto-lib ML-KEM-768 and ML-DSA-65
 * operations the PQC benchmark times. Key generation happens here, outside
 * the timed loop.
 */
export function createPqcOperations(): PqcOperations {
  const kem = mlKemKeygen(768);
  const dsa = mlDsaKeygen(65);
  const message = crypto.randomBytes(32);
  const { signature } = mlDsaSign(65, dsa.secretKey, message);

  return {
    mlKem768Encapsulate: () => mlKemEncap(768, kem.publicKey),
    mlKem768SecretKey: kem.secretKey,
    mlDsa65Verify: () => mlDsaVerify(65, dsa.publicKey, message, signature),
  };
}

/**
 * Benchmarks post-quantum primitives from crypto-lib (ML-KEM-768
 * encapsulation, ML-DSA-65 verification) against a classical P-256 ECDH
 * baseline from Node.js `crypto`.
 */
export async function runPqcBenchmarks(
  iterations = 30,
): Promise<BenchmarkItemResult[]> {
  const results: BenchmarkItemResult[] = [];

  // 1. Classical ECDH Key Agreement (Baseline)
  const ecdh1 = crypto.createECDH("prime256v1");
  const ecdh2 = crypto.createECDH("prime256v1");
  ecdh1.generateKeys();
  ecdh2.generateKeys();
  const pub2 = ecdh2.getPublicKey();

  const ecdhStats = await benchmarkOperation(
    () => {
      ecdh1.computeSecret(pub2);
    },
    { iterations, warmup: 5 },
  );

  results.push({
    name: "Classical ECDH Key Agreement (P-256)",
    category: "pqc",
    algorithm: "ECDH-P256",
    operation: "key-exchange",
    quantumSafe: false,
    stats: ecdhStats,
  });

  const ops = createPqcOperations();

  // 2. ML-KEM-768 encapsulation (crypto-lib, @noble/post-quantum)
  const kemStats = await benchmarkOperation(
    () => {
      ops.mlKem768Encapsulate();
    },
    { iterations, warmup: 5 },
  );

  results.push({
    name: "Post-Quantum ML-KEM-768 Key Encapsulation",
    category: "pqc",
    algorithm: "ML-KEM-768",
    operation: "encapsulate",
    quantumSafe: true,
    stats: kemStats,
  });

  // 3. ML-DSA-65 signature verification (crypto-lib, @noble/post-quantum)
  const dsaStats = await benchmarkOperation(
    () => {
      ops.mlDsa65Verify();
    },
    { iterations, warmup: 5 },
  );

  results.push({
    name: "Post-Quantum ML-DSA-65 Verification",
    category: "pqc",
    algorithm: "ML-DSA-65",
    operation: "verify",
    quantumSafe: true,
    stats: dsaStats,
  });

  return results;
}
