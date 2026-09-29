// SPDX-License-Identifier: Apache-2.0 OR MIT

export type SuiteName = "all" | "symmetric" | "asymmetric" | "pqc" | "hash";
export type OutputFormat = "table" | "json" | "markdown";

export interface BenchmarkConfig {
  suite?: SuiteName | undefined;
  iterations?: number | undefined;
  warmup?: number | undefined;
  format?: OutputFormat | undefined;
}

export interface BenchmarkStats {
  meanMs: number;
  medianMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  p99Ms: number;
  opsPerSec: number;
  totalDurationMs: number;
  iterations: number;
}

export interface BenchmarkItemResult {
  name: string;
  category: "symmetric" | "asymmetric" | "pqc" | "hash";
  algorithm: string;
  operation: string;
  quantumSafe: boolean;
  stats: BenchmarkStats;
}

export interface BenchmarkReport {
  timestamp: string;
  platform: string;
  nodeVersion: string;
  totalBenchmarks: number;
  results: BenchmarkItemResult[];
  summaryMarkdown: string;
  summaryTable: string;
}
