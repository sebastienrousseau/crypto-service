// SPDX-License-Identifier: Apache-2.0 OR MIT

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  formatLock,
  parseArgs,
  parseLock,
  restamp,
  sha256,
  verify,
} from "../sync-site-theme.mjs";

const COMMIT = "a".repeat(40);
const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

function lock(files, commit = COMMIT) {
  return { source: { repo: "r", commit }, files };
}

describe("sha256", () => {
  it("hashes bytes to lowercase hex", () => {
    assert.equal(sha256(Buffer.from("abc")), ABC);
  });
});

describe("parseLock", () => {
  const entry = { from: "static/a.css", to: "_layouts/a.css", sha256: ABC };

  it("accepts a well-formed lock", () => {
    const text = JSON.stringify(lock([entry]));
    assert.deepEqual(parseLock(text), lock([entry]));
  });
  it("accepts an unsynced seed (empty commit and hashes)", () => {
    const seed = lock([{ ...entry, sha256: "" }], "");
    assert.deepEqual(parseLock(JSON.stringify(seed)), seed);
  });
  it("rejects a malformed commit", () => {
    assert.throws(
      () => parseLock(JSON.stringify(lock([entry], "abc"))),
      /source.commit/,
    );
  });
  it("rejects a lock without files", () => {
    assert.throws(() => parseLock(JSON.stringify(lock([]))), /non-empty/);
    assert.throws(
      () => parseLock(JSON.stringify({ source: { commit: COMMIT } })),
      /non-empty/,
    );
  });
  it("rejects paths that escape their root", () => {
    for (const bad of ["../x", "/etc/passwd", "a/../../b", ""]) {
      assert.throws(
        () => parseLock(JSON.stringify(lock([{ ...entry, to: bad }]))),
        /relative "from" and "to"/,
      );
      assert.throws(
        () => parseLock(JSON.stringify(lock([{ ...entry, from: bad }]))),
        /relative "from" and "to"/,
      );
    }
    assert.throws(
      () => parseLock(JSON.stringify(lock([{ to: "a" }]))),
      /relative/,
    );
  });
  it("rejects a malformed hash", () => {
    for (const sha of ["xyz", ABC.toUpperCase(), undefined]) {
      assert.throws(
        () => parseLock(JSON.stringify(lock([{ ...entry, sha256: sha }]))),
        /malformed sha256/,
      );
    }
  });
  it("rejects two entries with the same target", () => {
    const twice = lock([entry, { ...entry, from: "static/b.css" }]);
    assert.throws(() => parseLock(JSON.stringify(twice)), /same path/);
  });
});

describe("verify", () => {
  const files = {
    "a.css": Buffer.from("abc"),
    "b.js": Buffer.from("changed"),
  };
  const read = (to) => files[to];

  it("passes when every copy matches", () => {
    assert.deepEqual(verify(lock([{ to: "a.css", sha256: ABC }]), read), []);
  });
  it("lists missing and changed files", () => {
    const problems = verify(
      lock([
        { to: "a.css", sha256: ABC },
        { to: "b.js", sha256: ABC },
        { to: "gone.woff2", sha256: ABC },
      ]),
      read,
    );
    assert.deepEqual(problems, [
      `b.js: sha256 ${sha256(Buffer.from("changed"))}, lock has ${ABC}`,
      "gone.woff2: missing",
    ]);
  });
  it("fails an unsynced seed", () => {
    assert.equal(verify(lock([{ to: "a.css", sha256: "" }]), read).length, 1);
  });
});

describe("restamp", () => {
  it("records the commit and each source file's hash", () => {
    const before = lock([{ from: "s/a.css", to: "a.css", sha256: "" }], "");
    const after = restamp(before, COMMIT, (from) => `hash-of-${from}`);
    assert.deepEqual(after, {
      source: { repo: "r", commit: COMMIT },
      files: [{ from: "s/a.css", to: "a.css", sha256: "hash-of-s/a.css" }],
    });
    assert.equal(before.source.commit, "", "input is not mutated");
  });
  it("refuses something that is not a commit SHA", () => {
    assert.throws(() => restamp(lock([]), "main", () => ""), /not a commit/);
  });
});

describe("formatLock", () => {
  it("writes two-space JSON with a trailing newline", () => {
    assert.equal(formatLock({ a: [1] }), '{\n  "a": [\n    1\n  ]\n}\n');
  });
});

describe("parseArgs", () => {
  it("reads --check and --from <dir>", () => {
    assert.deepEqual(parseArgs(["--check"]), { mode: "check" });
    assert.deepEqual(parseArgs(["--from", "../site"]), {
      mode: "from",
      site: "../site",
    });
  });
  it("rejects anything else", () => {
    for (const argv of [[], ["--from"], ["--from", ""], ["--x"], ["a", "b"]]) {
      assert.throws(() => parseArgs(argv), /usage/);
    }
  });
});

describe("website/THEME.lock.json", () => {
  it("is valid, synced from a commit, and matches the vendored files", () => {
    const website = new URL("../../website/", import.meta.url);
    const theme = parseLock(
      readFileSync(new URL("THEME.lock.json", website), "utf8"),
    );
    assert.match(theme.source.commit, /^[0-9a-f]{40}$/);
    const read = (to) => readFileSync(new URL(to, website));
    assert.deepEqual(verify(theme, read), []);
    assert.equal(
      formatLock(theme),
      readFileSync(new URL("THEME.lock.json", website), "utf8"),
    );
  });
});

describe("command line", () => {
  const script = fileURLToPath(
    new URL("../sync-site-theme.mjs", import.meta.url),
  );
  const run = (...args) =>
    spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });

  it("--check passes on the committed tree", () => {
    const { status, stdout } = run("--check");
    assert.equal(status, 0);
    assert.match(stdout, /^sync-site-theme: ok \(\d+ files\)/);
  });
  it("exits 2 with usage on bad arguments", () => {
    const { status, stderr } = run("--sync");
    assert.equal(status, 2);
    assert.match(stderr, /usage/);
  });
});
