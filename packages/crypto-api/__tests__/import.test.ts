/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { spawnSync } from "child_process";
import * as path from "path";

describe("importing the package", () => {
  it("has no side effects: init() runs only from the command line", () => {
    const entry = path.join(__dirname, "..", "src", "index.ts");
    const result = spawnSync(
      process.execPath,
      [
        "-r",
        "ts-node/register/transpile-only",
        "-e",
        `require(${JSON.stringify(entry)})`,
      ],
      { cwd: path.join(__dirname, ".."), encoding: "utf8" },
    );
    expect(result.status).to.equal(0);
    expect(result.stdout).to.equal("");
  });
});
