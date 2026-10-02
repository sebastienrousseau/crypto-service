#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT

import process from "node:process";
import { runSuite } from "./runner";
import { OutputFormat, SuiteName } from "./types";

const SUITES: readonly SuiteName[] = [
  "all",
  "symmetric",
  "asymmetric",
  "pqc",
  "hash",
];
const FORMATS: readonly OutputFormat[] = ["table", "json", "markdown"];

/** The value after `flag`, or undefined when the flag or value is absent. */
function optionValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
}

/** The lower-cased value of `flag` if it is one of `allowed`, else `fallback`. */
function pickChoice<T extends string>(
  args: string[],
  flag: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = optionValue(args, flag)?.toLowerCase();
  return allowed.find((a) => a === value) ?? fallback;
}

/** A positive iteration count, or the default of 30. */
function parseIterations(raw: string | undefined): number {
  const parsed = raw === undefined ? NaN : parseInt(raw, 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : 30;
}

export async function run(
  args: string[] = process.argv.slice(2),
): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write("Usage: crypto-benchmarks [options]\n");
    process.stdout.write("Options:\n");
    process.stdout.write(
      "  --suite <all|symmetric|asymmetric|pqc|hash>  Benchmark suite to run (default: all)\n",
    );
    process.stdout.write(
      "  --iterations <N>                             Number of iterations (default: 30)\n",
    );
    process.stdout.write(
      "  --format <table|json|markdown>               Output format (default: table)\n",
    );
    return 0;
  }

  const suite = pickChoice<SuiteName>(args, "--suite", SUITES, "all");
  const iterations = parseIterations(optionValue(args, "--iterations"));
  const format = pickChoice<OutputFormat>(args, "--format", FORMATS, "table");

  const report = await runSuite({ suite, iterations, format });

  const output: Record<OutputFormat, () => string> = {
    json: () => JSON.stringify(report, null, 2),
    markdown: () => report.summaryMarkdown,
    table: () => report.summaryTable,
  };
  process.stdout.write(output[format]() + "\n");

  return 0;
}

/* c8 ignore start */
if (require.main === module) {
  run().then((code) => process.exit(code));
}
/* c8 ignore stop */
