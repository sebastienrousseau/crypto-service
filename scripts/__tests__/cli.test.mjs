// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { runIfMain } from "../lib/cli.mjs";

const MODULE = "file:///repo/scripts/x.mjs";

/** A stand-in for `process` that records the exit code. */
function proc(entry) {
  return {
    argv: ["/usr/bin/node", entry, "--flag", "value"],
    exit(code) {
      this.code = code;
    },
  };
}

describe("runIfMain", () => {
  it("does nothing when another module is the entry point", async () => {
    const p = proc("/repo/scripts/test.mjs");
    let called = false;
    await runIfMain(MODULE, () => (called = true), { name: "x", proc: p });
    assert.equal(called, false);
    assert.equal(p.code, undefined);
  });

  it("passes the arguments and exits with main's code", async () => {
    const p = proc("/repo/scripts/x.mjs");
    let seen;
    await runIfMain(
      MODULE,
      async (argv) => {
        seen = argv;
        return 3;
      },
      { name: "x", proc: p },
    );
    assert.deepEqual(seen, ["--flag", "value"]);
    assert.equal(p.code, 3);
  });

  it("prints a thrown error and exits 1 by default", async () => {
    const p = proc("/repo/scripts/x.mjs");
    const errors = [];
    const boom = () => {
      throw new Error("boom");
    };
    await runIfMain(MODULE, boom, {
      name: "x",
      proc: p,
      error: (m) => errors.push(m),
    });
    assert.deepEqual(errors, ["x: boom"]);
    assert.equal(p.code, 1);
  });

  it("exits with the given failure code", async () => {
    const p = proc("/repo/scripts/x.mjs");
    const reject = async () => Promise.reject(new Error("no"));
    await runIfMain(MODULE, reject, {
      name: "x",
      failureCode: 2,
      proc: p,
      error: () => {},
    });
    assert.equal(p.code, 2);
  });

  it("runs a script as a process", () => {
    // render-ecosystem --check is offline and fast; it stands for the
    // wiring every script shares.
    const script = fileURLToPath(
      new URL("../render-ecosystem.mjs", import.meta.url),
    );
    const ok = spawnSync(process.execPath, [script, "--check"], {
      encoding: "utf8",
    });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(ok.stdout, "render-ecosystem: ok\n");
  });
});
