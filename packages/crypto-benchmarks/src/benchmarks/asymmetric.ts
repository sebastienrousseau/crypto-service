// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import { BenchmarkItemResult } from "../types";
import { benchmarkOperation } from "../timer";

/**
 * Benchmarks asymmetric classical algorithms (Ed25519, ECDSA-P256, RSA-2048).
 */
async function benchEd25519(
  message: Buffer,
  iterations: number,
): Promise<BenchmarkItemResult[]> {
  const edKeys = crypto.generateKeyPairSync("ed25519");
  let edSig: Buffer = Buffer.alloc(0);

  const edSignStats = await benchmarkOperation(
    () => {
      edSig = crypto.sign(null, message, edKeys.privateKey);
    },
    { iterations, warmup: 3 },
  );

  const edVerifyStats = await benchmarkOperation(
    () => {
      crypto.verify(null, message, edKeys.publicKey, edSig);
    },
    { iterations, warmup: 3 },
  );

  return [
    {
      name: "Ed25519 Digital Signing",
      category: "asymmetric",
      algorithm: "Ed25519",
      operation: "sign",
      quantumSafe: false,
      stats: edSignStats,
    },
    {
      name: "Ed25519 Signature Verification",
      category: "asymmetric",
      algorithm: "Ed25519",
      operation: "verify",
      quantumSafe: false,
      stats: edVerifyStats,
    },
  ];
}

async function benchEcdsa(
  message: Buffer,
  iterations: number,
): Promise<BenchmarkItemResult> {
  const ecKeys = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });

  const ecSignStats = await benchmarkOperation(
    () => {
      const sign = crypto.createSign("SHA256");
      sign.update(message);
      sign.end();
      sign.sign(ecKeys.privateKey);
    },
    { iterations, warmup: 3 },
  );

  return {
    name: "ECDSA (P-256) Digital Signing",
    category: "asymmetric",
    algorithm: "ECDSA-P256",
    operation: "sign",
    quantumSafe: false,
    stats: ecSignStats,
  };
}

async function benchRsa(
  message: Buffer,
  iterations: number,
): Promise<BenchmarkItemResult> {
  const rsaKeys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const rsaSignStats = await benchmarkOperation(
    () => {
      const sign = crypto.createSign("SHA256");
      sign.update(message);
      sign.end();
      sign.sign(rsaKeys.privateKey);
    },
    { iterations: Math.min(iterations, 10), warmup: 2 },
  );

  return {
    name: "RSA-2048 Digital Signing",
    category: "asymmetric",
    algorithm: "RSA-2048",
    operation: "sign",
    quantumSafe: false,
    stats: rsaSignStats,
  };
}

/**
 * Benchmarks asymmetric classical algorithms (Ed25519, ECDSA-P256, RSA-2048).
 */
export async function runAsymmetricBenchmarks(
  iterations = 20,
): Promise<BenchmarkItemResult[]> {
  const message = Buffer.from(
    "Financial Transaction ISO 20022 Compliance Payload",
  );

  const edResults = await benchEd25519(message, iterations);
  const ecResult = await benchEcdsa(message, iterations);
  const rsaResult = await benchRsa(message, iterations);

  return [...edResults, ecResult, rsaResult];
}
