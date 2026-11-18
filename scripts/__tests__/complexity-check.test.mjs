// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  compare,
  enclosingName,
  findingsOf,
  lint,
  main,
  measure,
} from "../complexity-check.mjs";

const tempRoot = () => `${mkdtempSync(join(tmpdir(), "complexity-"))}/`;

function capture() {
  const out = { logs: [], errors: [] };
  out.log = (m) => out.logs.push(m);
  out.error = (m) => out.errors.push(m);
  return out;
}

/** ESLint's message for a function over the cyclomatic limit. */
const cyclomatic = (line, name, value) => ({
  ruleId: "complexity",
  line,
  message: `${name ? `Function '${name}'` : "Arrow function"} has a complexity of ${value}. Maximum allowed is 10.`,
});

describe("enclosingName", () => {
  it("names a function from its first line", () => {
    assert.equal(
      enclosingName('app.post("/v1/keys", async () => {'),
      "POST /v1/keys",
    );
    assert.equal(enclosingName("const handler = async () => {"), "handler");
    assert.equal(
      enclosingName("export default function () {"),
      "default export",
    );
    assert.equal(enclosingName("function* walk(node) {"), "walk");
    assert.equal(enclosingName("  async encrypt(data: Buffer) {"), "encrypt");
    assert.equal(enclosingName("  get size<T>() {"), "size");
  });
  it("is undefined for control flow or an unnamed line", () => {
    assert.equal(enclosingName("  if (a) {"), undefined);
    assert.equal(enclosingName("  }).then(() => {"), undefined);
  });
});

describe("lint", () => {
  it("returns ESLint's report when it exits 1 on errors", () => {
    const exec = (cmd, args, options) => {
      assert.equal(cmd, "npx");
      assert.equal(args[2], "/r/eslint.config.mjs");
      assert.equal(options.cwd, "/r/");
      throw Object.assign(new Error("exit 1"), { stdout: "[1]" });
    };
    assert.deepEqual(lint("/r/", exec), [1]);
  });
});

/** One message per rule the gate reads, and one it ignores. */
const FILE = {
  filePath: "x.ts",
  messages: [
    cyclomatic(2, "f", 12),
    {
      ruleId: "sonarjs/cognitive-complexity",
      line: 2,
      message:
        "Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.",
    },
    {
      ruleId: "max-lines-per-function",
      line: 2,
      message: "Function 'f' has too many lines (61). Maximum allowed is 60.",
    },
    {
      ruleId: "max-lines",
      line: 99,
      message: "File has too many lines (501). Maximum allowed is 500.",
    },
    { ruleId: "no-unused-vars", line: 1, message: "'a' is unused." },
  ],
};

describe("findingsOf", () => {
  it("reads the metric, name, first line and value of each message", () => {
    const text = "const a = 1;\nfunction f() {\n  return 1;\n}\n";
    assert.deepEqual(findingsOf(FILE, text), [
      {
        metric: "complexity",
        name: "f",
        lineText: "function f() {",
        value: 12,
      },
      {
        metric: "sonarjs/cognitive-complexity",
        name: undefined,
        lineText: "function f() {",
        value: 16,
      },
      {
        metric: "max-lines-per-function",
        name: "f",
        lineText: "function f() {",
        value: 61,
      },
      { metric: "max-lines", name: undefined, lineText: "", value: 501 },
    ]);
  });
  it("adds Halstead difficulty over 30", () => {
    // Twenty distinct operators over two operands, used again and again.
    const ops = ["+", "-", "*", "/", "%", "&", "|", "^", "<<", ">>"];
    const expr = [...ops, "**", "&&", "||", "??", "<", ">", "<=", ">="]
      .map((o) => `a ${o} b`)
      .join(" + ");
    const text = `function busy(a, b) {\n  a = ${expr};\n  return a;\n}\n`;
    const [finding] = findingsOf({ filePath: "x.ts", messages: [] }, text);
    assert.equal(finding.metric, "halstead-difficulty");
    assert.equal(finding.name, "busy");
    assert.equal(finding.lineText, "function busy(a, b) {");
    assert.ok(finding.value > 30, `${finding.value}`);
  });
});

describe("measure", () => {
  it("keys each offender by file, metric and a stable name", () => {
    const root = tempRoot();
    const onDisk = join(root, "b.ts");
    writeFileSync(onDisk, "x\nconst named = () => {\n");
    const report = [
      {
        filePath: join(root, "a.ts"),
        source: "x\n  }).then(() => {\n  }).catch(() => {\n",
        messages: [cyclomatic(2, null, 11), cyclomatic(3, null, 12)],
      },
      {
        filePath: onDisk,
        messages: [cyclomatic(2, null, 11), cyclomatic(2, null, 14)],
      },
    ];
    assert.deepEqual(measure(report, root), {
      "a.ts :: complexity :: anonymous #1": 11,
      "a.ts :: complexity :: anonymous #2": 12,
      "b.ts :: complexity :: named": 14,
    });
  });
});

describe("compare", () => {
  it("fails new and worse offenders and lists fixed ones", () => {
    const { failures, fixed } = compare(
      { same: 5, better: 4, worse: 9, fresh: 1 },
      { same: 5, better: 6, worse: 8, gone: 3 },
    );
    assert.deepEqual(failures, [
      "worse: worse (8 -> 9)",
      "new offender: fresh (1)",
    ]);
    assert.deepEqual(fixed, ["gone"]);
  });
});

describe("main", () => {
  const report = (value) => () => [
    {
      filePath: "/r/a.ts",
      source: "const f = () => {\n",
      messages: [cyclomatic(1, "f", value)],
    },
  ];

  it("--update writes the sorted baseline", () => {
    const root = tempRoot();
    const out = capture();
    assert.equal(main(["--update"], { root, report: report(11), ...out }), 0);
    assert.deepEqual(out.logs, ["complexity: baseline written (1 offenders)"]);
    const baseline = readFileSync(
      join(root, "complexity-baseline.json"),
      "utf8",
    );
    assert.match(baseline, /^\{\n {2}".*a\.ts :: complexity :: f": 11\n\}\n$/);
  });
  it("fails a new offender when there is no baseline", () => {
    const out = capture();
    const code = main([], { root: tempRoot(), report: report(11), ...out });
    assert.equal(code, 1);
    assert.equal(out.errors[0], "complexity: gate failed");
    assert.match(
      out.errors[1],
      /^ {2}new offender: .*a\.ts :: complexity :: f \(11\)$/,
    );
  });
  it("passes an offender no worse than its baseline", () => {
    const root = tempRoot();
    main(["--update"], { root, report: report(12), log: () => {} });
    const out = capture();
    assert.equal(main([], { root, report: report(11), ...out }), 0);
    assert.deepEqual(out.logs, [
      "complexity: ok (1 recorded offenders, none worse)",
    ]);
  });
  it("lists fixed entries so the baseline can shrink", () => {
    const root = tempRoot();
    main(["--update"], { root, report: report(12), log: () => {} });
    const out = capture();
    assert.equal(main([], { root, report: () => [], ...out }), 0);
    assert.equal(
      out.logs[0],
      "complexity: 1 baseline entries fixed; run with --update to record:",
    );
    assert.match(out.logs[1], /a\.ts :: complexity :: f$/);
  });
  it("passes on the committed tree, linted by ESLint", () => {
    const out = capture();
    assert.equal(main([], out), 0, out.errors.join("\n"));
  });
});
