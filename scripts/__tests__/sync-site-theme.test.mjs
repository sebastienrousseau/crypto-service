// SPDX-License-Identifier: Apache-2.0 OR MIT

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  formatLock,
  main,
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
  it("rejects a lock with no source commit, or no lock at all", () => {
    for (const text of ["null", "{}", `{"source": {}}`]) {
      assert.throws(() => parseLock(text), /source.commit/, text);
    }
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

const FILES = [
  { from: "static/a.css", to: "_layouts/a.css", sha256: ABC },
  { from: "static/b.js", to: "_layouts/js/b.js", sha256: ABC },
];

/** A website/ with the lock and `a.css` vendored ("abc"); b.js absent. */
function website() {
  const dir = mkdtempSync(join(tmpdir(), "theme-website-"));
  mkdirSync(join(dir, "_layouts"));
  writeFileSync(join(dir, "_layouts/a.css"), "abc");
  writeFileSync(join(dir, "THEME.lock.json"), formatLock(lock(FILES)));
  return dir;
}
function capture() {
  const out = { logs: [], errors: [] };
  out.log = (m) => out.logs.push(m);
  out.error = (m) => out.errors.push(m);
  return out;
}

/** A site checkout: a git repository with the two locked files. */
function siteCheckout() {
  const site = mkdtempSync(join(tmpdir(), "theme-site-"));
  mkdirSync(join(site, "static"));
  writeFileSync(join(site, "static/a.css"), "new a");
  writeFileSync(join(site, "static/b.js"), "new b");
  const git = (...args) =>
    execFileSync("git", ["-C", site, ...args], { encoding: "utf8" }).trim();
  const identity = ["-c", "user.name=t", "-c", "user.email=t@example.com"];
  git("init", "-q");
  git("add", ".");
  git(...identity, "-c", "commit.gpgsign=false", "commit", "-qm", "theme");
  return { site, head: git("rev-parse", "HEAD") };
}

describe("main", () => {
  it("--check lists the missing and differing files", () => {
    const dir = website();
    writeFileSync(join(dir, "_layouts/a.css"), "edited");
    const out = capture();
    assert.equal(main(["--check"], { website: dir, ...out }), 1);
    assert.match(out.errors[0], /vendored files differ/);
    assert.match(
      out.errors[1],
      /^ {2}_layouts\/a\.css: sha256 [0-9a-f]{64}, lock has /,
    );
    assert.equal(out.errors[2], "  _layouts/js/b.js: missing");
  });
  it("--check passes when every copy matches", () => {
    const dir = website();
    mkdirSync(join(dir, "_layouts/js"));
    writeFileSync(join(dir, "_layouts/js/b.js"), "abc");
    const out = capture();
    assert.equal(main(["--check"], { website: dir, ...out }), 0);
    assert.deepEqual(out.logs, ["sync-site-theme: ok (2 files)"]);
  });
  it("--check rethrows a read error other than a missing file", () => {
    const dir = website();
    mkdirSync(join(dir, "_layouts/js/b.js"), { recursive: true });
    assert.throws(() => main(["--check"], { website: dir }), {
      code: "EISDIR",
    });
  });
  it("--from copies every file and restamps the lock", () => {
    const { site, head } = siteCheckout();
    const dir = website();
    const out = capture();
    assert.equal(main(["--from", site], { website: dir, ...out }), 0);
    assert.deepEqual(out.logs, [
      `sync-site-theme: 2 files from ${head.slice(0, 12)}`,
    ]);
    assert.equal(readFileSync(join(dir, "_layouts/js/b.js"), "utf8"), "new b");
    const next = parseLock(readFileSync(join(dir, "THEME.lock.json"), "utf8"));
    assert.equal(next.source.commit, head);
    assert.equal(next.files[0].sha256, sha256(Buffer.from("new a")));
    assert.equal(main(["--check"], { website: dir, ...out }), 0);
  });
});
