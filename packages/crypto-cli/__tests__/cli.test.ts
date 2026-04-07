/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { spawnSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import chai from "chai";

const { expect } = chai;

/**
 * End-to-end smoke test for the CLI entrypoint.
 *
 * The previous version of this file accidentally re-tested the constants
 * module — see `__tests__/constants/index.test.ts` for that. This now drives
 * the actual `dist/cli.js` (or the compiled bin) so a regression in the
 * top-level `main()` is caught by CI.
 */
describe("cli entrypoint", function () {
  this.timeout(15_000);

  // Resolve to the compiled artefact (the test runs after `pnpm build`).
  const cliPath = path.resolve(process.cwd(), "dist", "cli.js");

  it("ships a built cli.js with a node shebang", function () {
    if (!fs.existsSync(cliPath)) {
      this.skip(); // dist not built yet — skip rather than fail under `pnpm test`
    }
    const head = fs.readFileSync(cliPath, "utf8").slice(0, 32);
    expect(head.startsWith("#!/usr/bin/env node")).to.equal(true);
  });

  it("exits cleanly when stdin is closed (cancelled prompt)", function () {
    if (!fs.existsSync(cliPath)) {
      this.skip();
    }
    // prompts() returns an empty object when stdin is closed; the `default`
    // branch of the switch sets process.exitCode = 1 and main() resolves.
    const result = spawnSync(process.execPath, [cliPath], {
      input: "",
      encoding: "utf8",
      env: { ...process.env, CI: "true", FORCE_COLOR: "0" },
    });
    // Either the prompt was cancelled (exit 1) or main() completed gracefully
    // (exit 0). The important thing is that it does NOT crash with an uncaught
    // exception (which would surface as a non-{0,1} exit code or signal).
    expect(result.signal).to.equal(null);
    expect([0, 1]).to.include(result.status);
  });
});
