#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT

import process from "node:process";
import { runSuite } from "./runner";
import { OutputFormat, SuiteName } from "./types";

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

  let suite: SuiteName = "all";
  const suiteIdx = args.indexOf("--suite");
  if (suiteIdx !== -1 && args[suiteIdx + 1]) {
    const s = args[suiteIdx + 1].toLowerCase();
    if (["all", "symmetric", "asymmetric", "pqc", "hash"].includes(s)) {
      suite = s as SuiteName;
    }
  }

  let iterations = 30;
  const iterIdx = args.indexOf("--iterations");
  if (iterIdx !== -1 && args[iterIdx + 1]) {
    const parsed = parseInt(args[iterIdx + 1], 10);
    if (!isNaN(parsed) && parsed > 0) {
      iterations = parsed;
    }
  }

  let format: OutputFormat = "table";
  const formatIdx = args.indexOf("--format");
  if (formatIdx !== -1 && args[formatIdx + 1]) {
    const f = args[formatIdx + 1].toLowerCase();
    if (["table", "json", "markdown"].includes(f)) {
      format = f as OutputFormat;
    }
  }

  const report = await runSuite({ suite, iterations, format });

  if (format === "json") {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else if (format === "markdown") {
    process.stdout.write(report.summaryMarkdown + "\n");
  } else {
    process.stdout.write(report.summaryTable + "\n");
  }

  return 0;
}

/* c8 ignore start */
if (require.main === module) {
  run().then((code) => process.exit(code));
}
/* c8 ignore stop */
