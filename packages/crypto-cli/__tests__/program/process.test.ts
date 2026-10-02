/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 *
 * Runs src/cli.ts in a child process to check the real wiring of
 * stdin, stdout, stderr and the exit code.
 */
import { expect } from "chai";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const PACKAGE_DIR = path.join(__dirname, "..", "..");
const CLI = path.join(PACKAGE_DIR, "src", "cli.ts");
const TS_NODE = ["-r", require.resolve("ts-node/register")];

/** Run the CLI entry point with `args`, piping `input` to stdin. */
const spawnCli = (args: string[], input: string) =>
  spawnSync(process.execPath, [...TS_NODE, CLI, ...args], {
    cwd: PACKAGE_DIR,
    input,
    encoding: "utf8",
    timeout: 60000,
  });

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

  it("encrypt | decrypt: plaintext bytes on stdout, exit 0", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crypto-cli-proc-"));
    try {
      const keyFile = path.join(dir, "key");
      fs.writeFileSync(keyFile, randomBytes(32).toString("hex"), {
        mode: 0o600,
      });
      const plaintext = Buffer.from([0x00, 0xff, 0x0d, 0x0a, 0x80]);
      const enc = spawnSync(
        process.execPath,
        [...TS_NODE, CLI, "encrypt", "--key-file", keyFile],
        { cwd: PACKAGE_DIR, input: plaintext, timeout: 60000 },
      );
      expect(enc.status).to.equal(0);
      const dec = spawnSync(
        process.execPath,
        [...TS_NODE, CLI, "decrypt", "--key-file", keyFile],
        { cwd: PACKAGE_DIR, input: enc.stdout, timeout: 60000 },
      );
      expect(dec.status).to.equal(0);
      expect(dec.stderr.toString()).to.equal("");
      expect(Buffer.compare(dec.stdout, plaintext)).to.equal(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("no arguments without a TTY: usage on stderr, exit 2", () => {
    const r = spawnCli([], "");
    expect(r.status).to.equal(2);
    expect(r.stdout).to.equal("");
    expect(r.stderr).to.include("Usage: crypto-cli");
  });
});
