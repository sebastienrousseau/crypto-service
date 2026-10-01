#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Complexity gate: cyclomatic complexity <= 10, <= 60 lines per function
// and <= 500 lines per file across packages/*/src. Existing offenders are
// recorded in complexity-baseline.json; the gate fails when a new offender
// appears or a recorded one gets worse. The baseline may only shrink:
// regenerate it with `--update` only to record an improvement.
//
// Cognitive complexity and Halstead difficulty are not measured yet (they
// need extra tooling).

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const BASELINE = `${ROOT}complexity-baseline.json`;
const RULES = {
  complexity: ["error", 10],
  "max-lines-per-function": [
    "error",
    { max: 60, skipBlankLines: true, skipComments: true },
  ],
  "max-lines": [
    "error",
    { max: 500, skipBlankLines: true, skipComments: true },
  ],
};

/**
 * A stable name for an unnamed function from its first line: the variable
 * it is assigned to, or the HTTP route it handles. Line numbers would make
 * every edit above the function look like a new offender.
 */
function enclosingName(line) {
  const route = /\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)/.exec(line);
  if (route) return `${route[1].toUpperCase()} ${route[2]}`;
  const variable = /(?:const|let|var)\s+(\w+)/.exec(line);
  if (variable) return variable[1];
  if (/export\s+default/.test(line)) return "default export";
  return undefined;
}

/** Run ESLint with only the complexity rules; return offenders. */
function measure() {
  let out;
  try {
    out = execFileSync(
      "npx",
      [
        "eslint",
        "--no-eslintrc",
        "-c",
        `${ROOT}.eslintrc`,
        "--rule",
        JSON.stringify(RULES),
        "-f",
        "json",
        "packages/*/src/**/*.ts",
      ],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (e) {
    out = e.stdout; // ESLint exits 1 when it reports errors
  }
  const offenders = {};
  for (const file of JSON.parse(out)) {
    const lines =
      file.source?.split("\n") ??
      readFileSync(file.filePath, "utf8").split("\n");
    const anonymous = {};
    for (const m of file.messages) {
      if (!(m.ruleId in RULES)) continue;
      const value = Number(
        /\((\d+)\)|of (\d+)/.exec(m.message)?.slice(1).find(Boolean),
      );
      const name =
        /'([^']+)'/.exec(m.message)?.[1] ??
        enclosingName(lines[m.line - 1] ?? "") ??
        `anonymous #${(anonymous[m.ruleId] = (anonymous[m.ruleId] ?? 0) + 1)}`;
      const key = `${relative(ROOT, file.filePath)} :: ${m.ruleId} :: ${name}`;
      offenders[key] = Math.max(offenders[key] ?? 0, value);
    }
  }
  return offenders;
}

const current = measure();

if (process.argv.includes("--update")) {
  const sorted = Object.fromEntries(Object.entries(current).sort());
  writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + "\n");
  console.log(
    `complexity: baseline written (${Object.keys(sorted).length} offenders)`,
  );
  process.exit(0);
}

const baseline = existsSync(BASELINE)
  ? JSON.parse(readFileSync(BASELINE, "utf8"))
  : {};
const failures = [];
for (const [key, value] of Object.entries(current)) {
  if (!(key in baseline)) failures.push(`new offender: ${key} (${value})`);
  else if (value > baseline[key])
    failures.push(`worse: ${key} (${baseline[key]} -> ${value})`);
}
const fixed = Object.keys(baseline).filter((k) => !(k in current));

if (fixed.length > 0) {
  console.log(
    `complexity: ${fixed.length} baseline entries fixed; run with --update to record:`,
  );
  for (const k of fixed) console.log(`  ${k}`);
}
if (failures.length > 0) {
  console.error("complexity: gate failed");
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `complexity: ok (${Object.keys(current).length} recorded offenders, none worse)`,
);
