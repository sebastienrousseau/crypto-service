// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename } from "node:path";
import { it } from "node:test";

// Node's coverage report lists only the modules a test loads, so a
// script nothing imports would escape the 100% floor of test:scripts.
// Each script must have a test file of its own name that imports it.

const SCRIPTS = new URL("../", import.meta.url);
const TESTS = new URL("./", import.meta.url);

it("every script has a test file that imports it", () => {
  const scripts = readdirSync(SCRIPTS, { recursive: true })
    .filter((path) => path.endsWith(".mjs") && !path.startsWith("__tests__"))
    .sort();
  assert.ok(scripts.length >= 19, `only ${scripts.length} scripts found`);
  const missing = scripts.filter((path) => {
    const test = new URL(`${basename(path, ".mjs")}.test.mjs`, TESTS);
    if (!existsSync(test)) return true;
    const text = readFileSync(test, "utf8");
    return !text.includes(`"../${path}"`);
  });
  assert.deepEqual(missing, []);
});
