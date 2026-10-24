// SPDX-License-Identifier: Apache-2.0 OR MIT

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { it } from "node:test";

const ROOT = new URL("../..", import.meta.url).pathname;

it("every package source file carries an SPDX licence header", () => {
  const files = execFileSync(
    "git",
    [
      "ls-files",
      "packages/*/src/*.ts",
      "packages/*/src/**/*.ts",
      "packages/*/src/**/*.tsx",
    ],
    { cwd: ROOT, encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);
  assert.ok(files.length > 100, `only ${files.length} source files found`);
  const missing = files.filter(
    (file) =>
      !readFileSync(`${ROOT}${file}`, "utf8")
        .split("\n", 6)
        .some((line) => line.includes("SPDX-License-Identifier: ")),
  );
  assert.deepEqual(missing, []);
});
