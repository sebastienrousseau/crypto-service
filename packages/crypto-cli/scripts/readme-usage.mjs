#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Regenerate the command reference in README.md from the command
// definitions (run `pnpm run build` first). The test suite fails when
// the README block differs from what this writes.

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { replaceUsage } = require("../dist/program/usage.js");
const readme = new URL("../README.md", import.meta.url);

writeFileSync(readme, replaceUsage(readFileSync(readme, "utf8")));
