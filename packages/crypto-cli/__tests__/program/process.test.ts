/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 *
 * Runs src/cli.ts in a child process to check the real wiring of
 * stdin, stdout, stderr and the exit code.
 */
import { expect } from "chai";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as path from "node:path";

const PACKAGE_DIR = path.join(__dirname, "..", "..");
const CLI = path.join(PACKAGE_DIR, "src", "cli.ts");

/** Run the CLI entry point with `args`, piping `input` to stdin. */
const spawnCli = (args: string[], input: string) =>
  spawnSync(
    process.execPath,
    ["-r", require.resolve("ts-node/register"), CLI, ...args],
    { cwd: PACKAGE_DIR, input, encoding: "utf8", timeout: 60000 },
  );

describe("crypto-cli process", function () {
  this.timeout(120000);

  it("hash --json < stdin: JSON on stdout, exit 0", () => {
    const r = spawnCli(["hash", "--json"], "hello");
    expect(r.status).to.equal(0);
    expect(r.stderr).to.equal("");
    expect(JSON.parse(r.stdout)).to.deep.equal({
      digest: createHash("sha256").update("hello").digest("hex"),
      algorithm: "sha256",
      length: 32,
    });
  });

  it("no arguments without a TTY: usage on stderr, exit 2", () => {
    const r = spawnCli([], "");
    expect(r.status).to.equal(2);
    expect(r.stdout).to.equal("");
    expect(r.stderr).to.include("Usage: crypto-cli");
  });
});
