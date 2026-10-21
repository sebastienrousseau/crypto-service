// SPDX-License-Identifier: Apache-2.0 OR MIT

import process from "node:process";
import { BenchmarkStats } from "./types";

export interface TimerOptions {
  iterations?: number | undefined;
  warmup?: number | undefined;
}

/** Runs `fn` once, awaiting it when it returns a promise. */
async function runOnce(fn: () => void | Promise<void>): Promise<void> {
  const res = fn();
  if (res instanceof Promise) {
    await res;
  }
}

/** Nanoseconds from `process.hrtime.bigint()` to milliseconds. */
const toMs = (ns: bigint): number => Number(ns) / 1_000_000;

/** Rounds to four decimals, the precision every reported time uses. */
const round4 = (ms: number): number => Number(ms.toFixed(4));

/** Iteration and warmup counts, falling back to 10 and 2. */
function resolveOptions(options: TimerOptions): {
  iterations: number;
  warmup: number;
} {
  const { iterations, warmup } = options;
  return {
    iterations: iterations && iterations > 0 ? iterations : 10,
    warmup: warmup !== undefined && warmup >= 0 ? warmup : 2,
  };
}

/** Times `iterations` runs of `fn`: each run, and the whole loop. */
async function sample(
  fn: () => void | Promise<void>,
  iterations: number,
): Promise<{ timesMs: number[]; totalDurationMs: number }> {
  const timesMs: number[] = [];
  const startTotal = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await runOnce(fn);
    timesMs.push(toMs(process.hrtime.bigint() - start));
  }
  const totalDurationMs = toMs(process.hrtime.bigint() - startTotal);
  return { timesMs, totalDurationMs };
}

/** The value at fraction `q` of an ascending list, capped at its end. */
const percentile = (sorted: number[], q: number): number =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];

/** The median of an ascending list. */
function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Summary statistics of `timesMs`, which is sorted in place. */
function summarize(
  timesMs: number[],
  iterations: number,
  totalDurationMs: number,
): BenchmarkStats {
  timesMs.sort((a, b) => a - b);
  const sumMs = timesMs.reduce((acc, val) => acc + val, 0);
  return {
    meanMs: round4(sumMs / iterations),
    medianMs: round4(median(timesMs)),
    minMs: round4(timesMs[0]),
    maxMs: round4(timesMs[timesMs.length - 1]),
    p95Ms: round4(percentile(timesMs, 0.95)),
    p99Ms: round4(percentile(timesMs, 0.99)),
    opsPerSec: Math.round((iterations / totalDurationMs) * 1000),
    totalDurationMs: round4(totalDurationMs),
    iterations,
  };
}

/**
 * Runs and measures an operation with statistical distribution.
 */
export async function benchmarkOperation(
  fn: () => void | Promise<void>,
  options: TimerOptions = {},
): Promise<BenchmarkStats> {
  const { iterations, warmup } = resolveOptions(options);

  // Warmup phase
  for (let i = 0; i < warmup; i++) {
    await runOnce(fn);
  }

  const { timesMs, totalDurationMs } = await sample(fn, iterations);
  return summarize(timesMs, iterations, totalDurationMs);
}
