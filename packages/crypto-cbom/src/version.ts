// SPDX-License-Identifier: Apache-2.0 OR MIT

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The version of this package, read at runtime from its own `package.json`
 * so that a version bump can never leave a stale literal behind.
 *
 * The path resolves from both `src/` (ts-node) and `dist/` (compiled
 * output): each sits one level below the package root, per the
 * `rootDir`/`outDir` settings in `tsconfig.json`.
 */
export const VERSION: string = (
  JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as {
    version: string;
  }
).version;
