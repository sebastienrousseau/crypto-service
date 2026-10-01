// SPDX-License-Identifier: Apache-2.0 OR MIT

import process from "node:process";
import os from "node:os";
import { BenchmarkConfig, BenchmarkItemResult, BenchmarkReport } from "./types";
import { runSymmetricBenchmarks } from "./benchmarks/symmetric";
import { runAsymmetricBenchmarks } from "./benchmarks/asymmetric";
import { runPqcBenchmarks } from "./benchmarks/pqc";
import { runHashBenchmarks } from "./benchmarks/hash";

/**
 * Runs benchmarks according to the provided configuration.
 */
export async function runSuite(
  config: BenchmarkConfig = {},
): Promise<BenchmarkReport> {
  const suite = config.suite || "all";
  const iterations = config.iterations || 30;
  const results: BenchmarkItemResult[] = [];

  // In report order; "all" runs every suite.
  const suites = {
    symmetric: runSymmetricBenchmarks,
    asymmetric: runAsymmetricBenchmarks,
    pqc: runPqcBenchmarks,
    hash: runHashBenchmarks,
  };
  for (const [name, run] of Object.entries(suites)) {
    if (suite === "all" || suite === name) {
      results.push(...(await run(iterations)));
    }
  }

  const timestamp = new Date().toISOString();
  const platform = `${os.platform()} ${os.arch()}`;
  const nodeVersion = process.version;

  // Generate Markdown Summary
  const mdRows = results.map((r) => {
    const qs = r.quantumSafe ? "✅ Yes" : "❌ No";
    return `| ${r.name} | ${r.algorithm} | ${r.stats.meanMs.toFixed(3)} | ${r.stats.p95Ms.toFixed(3)} | ${r.stats.opsPerSec.toLocaleString()} | ${qs} |`;
  });

  const summaryMarkdown = [
    `# Cryptographic Performance Benchmark Report`,
    ``,
    `- **Date:** ${timestamp}`,
    `- **Platform:** ${platform}`,
    `- **Node.js:** ${nodeVersion}`,
    `- **Total Benchmarks:** ${results.length}`,
    ``,
    `| Benchmark | Algorithm | Mean (ms) | p95 (ms) | Ops/sec | Quantum Safe |`,
    `| :--- | :--- | :--- | :--- | :--- | :--- |`,
    ...mdRows,
    ``,
  ].join("\n");

  // Generate ASCII Table Summary
  const tableHeader = `Name                            Algorithm      Mean(ms)  Ops/sec    QuantumSafe`;
  const tableDivider = `--------------------------------------------------------------------------------`;
  const tableRows = results.map((r) => {
    const name = r.name.padEnd(32).slice(0, 32);
    const alg = r.algorithm.padEnd(14).slice(0, 14);
    const mean = r.stats.meanMs.toFixed(3).padStart(8);
    const ops = r.stats.opsPerSec.toLocaleString().padStart(10);
    const qs = (r.quantumSafe ? "Yes" : "No").padStart(10);
    return `${name} ${alg} ${mean} ${ops} ${qs}`;
  });

  const summaryTable = [
    tableHeader,
    tableDivider,
    ...tableRows,
    tableDivider,
  ].join("\n");

  return {
    timestamp,
    platform,
    nodeVersion,
    totalBenchmarks: results.length,
    results,
    summaryMarkdown,
    summaryTable,
  };
}
