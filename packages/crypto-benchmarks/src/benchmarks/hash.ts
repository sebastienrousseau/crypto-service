// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import { BenchmarkItemResult } from "../types";
import { benchmarkOperation } from "../timer";

/**
 * Benchmarks cryptographic hash functions (SHA-256, SHA-512, SHA3-256, BLAKE2b512).
 */
export async function runHashBenchmarks(
  iterations = 50,
): Promise<BenchmarkItemResult[]> {
  const results: BenchmarkItemResult[] = [];
  const payload = crypto.randomBytes(4096); // 4 KB payload

  // 1. SHA-256
  const sha256Stats = await benchmarkOperation(
    () => {
      crypto.createHash("sha256").update(payload).digest();
    },
    { iterations, warmup: 5 },
  );

  results.push({
    name: "SHA-256 Throughput (4KB)",
    category: "hash",
    algorithm: "SHA-256",
    operation: "hash",
    quantumSafe: true,
    stats: sha256Stats,
  });

  // 2. SHA-512
  const sha512Stats = await benchmarkOperation(
    () => {
      crypto.createHash("sha512").update(payload).digest();
    },
    { iterations, warmup: 5 },
  );

  results.push({
    name: "SHA-512 Throughput (4KB)",
    category: "hash",
    algorithm: "SHA-512",
    operation: "hash",
    quantumSafe: true,
    stats: sha512Stats,
  });

  // 3. SHA3-256
  const sha3Stats = await benchmarkOperation(
    () => {
      crypto.createHash("sha3-256").update(payload).digest();
    },
    { iterations, warmup: 5 },
  );

  results.push({
    name: "SHA3-256 (Keccak) Throughput (4KB)",
    category: "hash",
    algorithm: "SHA3-256",
    operation: "hash",
    quantumSafe: true,
    stats: sha3Stats,
  });

  return results;
}
