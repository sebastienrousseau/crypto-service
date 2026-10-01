/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { readFileSync } from "fs";
import { join } from "path";

/**
 * This package's version, read from its package.json so it cannot drift.
 * The path resolves from both `src/lib` (ts-node) and `dist/lib`.
 */
export const PACKAGE_VERSION = (
  JSON.parse(
    readFileSync(join(__dirname, "..", "..", "package.json"), "utf8"),
  ) as { version: string }
).version;
