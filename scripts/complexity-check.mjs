#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Complexity gate across packages/*/src, per function: cyclomatic
// complexity <= 10, cognitive complexity <= 15 (SonarSource's rule from
// eslint-plugin-sonarjs), Halstead difficulty <= 30 (scripts/halstead.mjs)
// and <= 60 lines; and <= 500 lines per file. Existing offenders are
// recorded in complexity-baseline.json; the gate fails when a new offender
// appears or a recorded one gets worse. The baseline may only shrink:
// regenerate it with `--update` only to record an improvement.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { relative } from "node:path";
import { measureHalstead } from "./halstead.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const BASELINE = `${ROOT}complexity-baseline.json`;
const HALSTEAD_MAX = 30;
const RULES = {
  complexity: ["error", 10],
  "sonarjs/cognitive-complexity": ["error", 15],
  "max-lines-per-function": [
    "error",
    { max: 60, skipBlankLines: true, skipComments: true },
  ],
  "max-lines": [
    "error",
    { max: 500, skipBlankLines: true, skipComments: true },
  ],
};

// A method or accessor head, `async name(` or `get name(`; control-flow
// keywords share the shape and are not names.
const METHOD =
  /^\s*(?:(?:public|private|protected|static|async|override|get|set)\s+)*(\w+)\s*[(<]/;
const KEYWORDS = new Set(["if", "for", "while", "switch", "catch", "return"]);

/**
 * A stable name for a function whose report carries none, from its first
 * line: the HTTP route it handles, the variable it is assigned to, or its
 * declared or method name (SonarJS reports name no function). Line numbers
 * would make every edit above the function look like a new offender.
 */
function enclosingName(line) {
  const route = /\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)/.exec(line);
  if (route) return `${route[1].toUpperCase()} ${route[2]}`;
  const variable = /(?:const|let|var)\s+(\w+)/.exec(line);
  if (variable) return variable[1];
  if (/export\s+default/.test(line)) return "default export";
  const declared = /function\*?\s+(\w+)/.exec(line);
  if (declared) return declared[1];
  const method = METHOD.exec(line);
  if (method && !KEYWORDS.has(method[1])) return method[1];
  return undefined;
}

/** Run ESLint with only the complexity rules; return its JSON report. */
function lint() {
  let out;
  try {
    out = execFileSync(
      "npx",
      [
        "eslint",
        "-c",
        `${ROOT}eslint.config.mjs`,
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
  return JSON.parse(out);
}

/** ESLint's and Halstead's findings for one file: { metric, name, lineText, value }. */
function findingsOf(file, text) {
  const lines = text.split("\n");
  const findings = measureHalstead(text, file.filePath, HALSTEAD_MAX).map(
    (h) => ({ metric: "halstead-difficulty", ...h }),
  );
  for (const m of file.messages) {
    if (!(m.ruleId in RULES)) continue;
    findings.push({
      metric: m.ruleId,
      name: /'([^']+)'/.exec(m.message)?.[1],
      lineText: lines[m.line - 1] ?? "",
      value: Number(
        /\((\d+)\)|(?:of|from) (\d+)/.exec(m.message)?.slice(1).find(Boolean),
      ),
    });
  }
  return findings;
}

/** Every offender in the workspace, keyed `file :: metric :: function`. */
function measure() {
  const offenders = {};
  for (const file of lint()) {
    const text = file.source ?? readFileSync(file.filePath, "utf8");
    const anonymous = {};
    for (const f of findingsOf(file, text)) {
      const name =
        f.name ??
        enclosingName(f.lineText) ??
        `anonymous #${(anonymous[f.metric] = (anonymous[f.metric] ?? 0) + 1)}`;
      const key = `${relative(ROOT, file.filePath)} :: ${f.metric} :: ${name}`;
      offenders[key] = Math.max(offenders[key] ?? 0, f.value);
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
