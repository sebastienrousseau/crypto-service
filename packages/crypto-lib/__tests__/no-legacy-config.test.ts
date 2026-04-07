/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as fs from "fs";
import * as path from "path";
import chai from "chai";

const { expect } = chai;

/**
 * Regression guard for the deleted legacy modules.
 *
 * `src/enums.ts` exposed `keySize512` / `keySize1024` and `src/config/config.ts`
 * defaulted `preferredCurve` to NIST P-256 — primitives the modern pure API
 * deliberately avoids. They were orphans (no caller anywhere in src or tests)
 * but still shipped in the published `dist/` tarball, so a downstream user
 * who imported them would silently get insecure defaults. This test fails
 * the build if anyone tries to put them back.
 *
 * Resolved against `process.cwd()` instead of `__dirname` so the spec works
 * under both CommonJS and the ESM loader path used by some mocha+ts-node
 * configurations.
 */
describe("legacy config orphans (regression guard)", function () {
  const root = path.resolve(process.cwd(), "src");

  it("does not ship src/enums.ts", function () {
    expect(fs.existsSync(path.join(root, "enums.ts"))).to.equal(false);
  });

  it("does not ship src/config/config.ts", function () {
    expect(fs.existsSync(path.join(root, "config", "config.ts"))).to.equal(
      false,
    );
  });
});
