// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import { BenchmarkItemResult } from "../types";
import { benchmarkOperation } from "../timer";

/**
 * Benchmarks symmetric ciphers (AES-256-GCM, ChaCha20-Poly1305, AES-128-CBC).
 */
export async function runSymmetricBenchmarks(
  iterations = 50,
): Promise<BenchmarkItemResult[]> {
  const results: BenchmarkItemResult[] = [];
  const payload = crypto.randomBytes(1024); // 1 KB
  const key32 = crypto.randomBytes(32);
  const key16 = crypto.randomBytes(16);
  const iv12 = crypto.randomBytes(12);
  const iv16 = crypto.randomBytes(16);

  // 1. AES-256-GCM Encryption
  const aesGcmEncStats = await benchmarkOperation(
    () => {
      const cipher = crypto.createCipheriv("aes-256-gcm", key32, iv12);
      cipher.update(payload);
      cipher.final();
      cipher.getAuthTag();
    },
    { iterations, warmup: 5 },
  );

  results.push({
    name: "AES-256-GCM Encryption (1KB)",
    category: "symmetric",
    algorithm: "AES-256-GCM",
    operation: "encrypt",
    quantumSafe: true,
    stats: aesGcmEncStats,
  });

  // 2. ChaCha20-Poly1305 Encryption
  const chachaEncStats = await benchmarkOperation(
    () => {
      const cipher = crypto.createCipheriv("chacha20-poly1305", key32, iv12, {
        authTagLength: 16,
      });
      cipher.update(payload);
      cipher.final();
      cipher.getAuthTag();
    },
    { iterations, warmup: 5 },
  );

  results.push({
    name: "ChaCha20-Poly1305 Encryption (1KB)",
    category: "symmetric",
    algorithm: "ChaCha20-Poly1305",
    operation: "encrypt",
    quantumSafe: true,
    stats: chachaEncStats,
  });

  // 3. AES-128-CBC Encryption (Legacy baseline)
  const aesCbcEncStats = await benchmarkOperation(
    () => {
      const cipher = crypto.createCipheriv("aes-128-cbc", key16, iv16);
      cipher.update(payload);
      cipher.final();
    },
    { iterations, warmup: 5 },
  );

  results.push({
    name: "AES-128-CBC Encryption (1KB)",
    category: "symmetric",
    algorithm: "AES-128-CBC",
    operation: "encrypt",
    quantumSafe: false,
    stats: aesCbcEncStats,
  });

  return results;
}
