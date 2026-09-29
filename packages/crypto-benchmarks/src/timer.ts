// SPDX-License-Identifier: Apache-2.0 OR MIT

import process from "node:process";
import { BenchmarkStats } from "./types";

export interface TimerOptions {
  iterations?: number | undefined;
  warmup?: number | undefined;
}

/**
 * Runs and measures an operation with statistical distribution.
 */
export async function benchmarkOperation(
  fn: () => void | Promise<void>,
  options: TimerOptions = {},
): Promise<BenchmarkStats> {
  const iterations =
    options.iterations && options.iterations > 0 ? options.iterations : 10;
  const warmup =
    options.warmup !== undefined && options.warmup >= 0 ? options.warmup : 2;

  // Warmup phase
  for (let i = 0; i < warmup; i++) {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
  }

  const timesMs: number[] = [];
  const startTotal = process.hrtime.bigint();

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    const end = process.hrtime.bigint();
    const diffMs = Number(end - start) / 1_000_000;
    timesMs.push(diffMs);
  }

  const endTotal = process.hrtime.bigint();
  const totalDurationMs = Number(endTotal - startTotal) / 1_000_000;

  timesMs.sort((a, b) => a - b);
  const minMs = timesMs[0];
  const maxMs = timesMs[timesMs.length - 1];
  const sumMs = timesMs.reduce((acc, val) => acc + val, 0);
  const meanMs = sumMs / iterations;

  const mid = Math.floor(timesMs.length / 2);
  const medianMs =
    timesMs.length % 2 !== 0
      ? timesMs[mid]
      : (timesMs[mid - 1] + timesMs[mid]) / 2;

  const p95Idx = Math.min(
    timesMs.length - 1,
    Math.floor(timesMs.length * 0.95),
  );
  const p99Idx = Math.min(
    timesMs.length - 1,
    Math.floor(timesMs.length * 0.99),
  );
  const p95Ms = timesMs[p95Idx];
  const p99Ms = timesMs[p99Idx];

  const opsPerSec = (iterations / totalDurationMs) * 1000;

  return {
    meanMs: Number(meanMs.toFixed(4)),
    medianMs: Number(medianMs.toFixed(4)),
    minMs: Number(minMs.toFixed(4)),
    maxMs: Number(maxMs.toFixed(4)),
    p95Ms: Number(p95Ms.toFixed(4)),
    p99Ms: Number(p99Ms.toFixed(4)),
    opsPerSec: Math.round(opsPerSec),
    totalDurationMs: Number(totalDurationMs.toFixed(4)),
    iterations,
  };
}
