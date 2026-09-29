#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT

import fs from "node:fs";
import process from "node:process";
import { scanDirectory } from "./scanner";
import { generateCycloneDxCbom } from "./cyclonedx";
import { generateSpdxCbom } from "./spdx";
import { auditCbom } from "./audit";
import { validateCbom } from "./validator";

export function run(args: string[] = process.argv.slice(2)): number {
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    process.stdout.write("Usage: crypto-cbom <scan|audit> [options]\n");
    process.stdout.write("Commands:\n");
    process.stdout.write(
      "  scan <dir> [--format cyclonedx|spdx] [--output <file>]\n",
    );
    process.stdout.write("  audit <file.json>\n");
    return 0;
  }

  if (command === "scan") {
    const targetDir = args[1] || ".";
    const formatIdx = args.indexOf("--format");
    const format =
      formatIdx !== -1 && args[formatIdx + 1]
        ? args[formatIdx + 1]
        : "cyclonedx";
    const outIdx = args.indexOf("--output");
    const outFile = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : null;

    const assets = scanDirectory(targetDir);
    const cbom =
      format === "spdx"
        ? generateSpdxCbom(assets)
        : generateCycloneDxCbom(assets);
    const json = JSON.stringify(cbom, null, 2);

    if (outFile) {
      fs.writeFileSync(outFile, json, "utf8");
    } else {
      process.stdout.write(json + "\n");
    }
    return 0;
  }

  if (command === "audit") {
    const filePath = args[1];
    if (!filePath || !fs.existsSync(filePath)) {
      process.stderr.write(`Error: file not found '${String(filePath)}'\n`);
      return 1;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const val = validateCbom(parsed);
    if (!val.valid) {
      process.stderr.write(`Validation failed: ${val.errors.join(", ")}\n`);
      return 1;
    }
    const result = auditCbom(parsed);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return result.doraStatus === "NON_COMPLIANT" ? 1 : 0;
  }

  process.stderr.write(`Unknown command '${command}'\n`);
  return 1;
}

/* c8 ignore start */
if (require.main === module) {
  process.exit(run());
}
/* c8 ignore stop */
