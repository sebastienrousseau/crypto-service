/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * The README's Configuration table against the code: every environment
 * variable the server reads is documented, and every documented one is
 * read. The table was written by hand, and nothing kept it in step.
 */
import { expect } from "chai";
import { readdirSync, readFileSync, statSync } from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..");

/** Ways the server reads a setting from the environment. */
const READS = [
  /\benv\[\s*"([A-Z][A-Z0-9_]+)"\s*\]/g,
  /\bprocess\.env\.([A-Z][A-Z0-9_]+)/g,
  /\b(?:integerSetting|flagSetting)\(\s*\w+,\s*"([A-Z][A-Z0-9_]+)"/g,
  /\bget\("([A-Z][A-Z0-9_]+)"\)/g,
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) return sourceFiles(file);
    return file.endsWith(".ts") ? [file] : [];
  });
}

function settingsRead(): Set<string> {
  const names = new Set<string>();
  for (const file of sourceFiles(path.join(ROOT, "src"))) {
    const text = readFileSync(file, "utf8");
    for (const pattern of READS) {
      for (const m of text.matchAll(pattern)) names.add(m[1]!);
    }
  }
  return names;
}

function settingsDocumented(): Set<string> {
  const readme = readFileSync(path.join(ROOT, "README.md"), "utf8");
  const start = readme.indexOf("## Configuration");
  const section = readme.slice(start, readme.indexOf("\n## ", start + 1));
  const names = new Set<string>();
  for (const line of section.split("\n")) {
    const first = /^\| ((?:`[A-Z][A-Z0-9_]+`(?:, )?)+) /.exec(line);
    for (const m of first?.[1]!.matchAll(/`([A-Z][A-Z0-9_]+)`/g) ?? []) {
      names.add(m[1]!);
    }
  }
  return names;
}

describe("README Configuration table", () => {
  it("documents exactly the settings the server reads", () => {
    const read = settingsRead();
    const documented = settingsDocumented();
    expect(read.size).to.be.greaterThan(20);
    expect(
      [...read].filter((n) => !documented.has(n)),
      "read but not documented",
    ).to.deep.equal([]);
    expect(
      [...documented].filter((n) => !read.has(n)),
      "documented but not read",
    ).to.deep.equal([]);
  });
});
