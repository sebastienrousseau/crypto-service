// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  main,
  pack,
  publishableDirs,
  runAttw,
  runPublint,
} from "../check-packages.mjs";

const temp = (prefix) => mkdtempSync(join(tmpdir(), prefix));

/** A tiny package whose `main` names a file it does not ship. */
function tinyPackage() {
  const dir = temp("tiny-");
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "tiny",
      version: "1.0.0",
      main: "missing.js",
      files: ["index.js"],
    }),
  );
  writeFileSync(join(dir, "index.js"), "module.exports = 1;\n");
  return dir;
}

/** An executable that prints `out` and exits `code`, standing in for attw. */
function fakeAttw(code, out) {
  const file = join(temp("attw-"), "attw");
  writeFileSync(file, `#!/bin/sh\necho "${out}"\nexit ${code}\n`);
  chmodSync(file, 0o755);
  return file;
}

function tree() {
  const root = `${temp("check-packages-")}/`;
  const add = (dir, pkg) => {
    mkdirSync(join(root, "packages", dir), { recursive: true });
    writeFileSync(join(root, "packages", dir, "package.json"), pkg);
  };
  add("crypto-a", `{"name": "@s/a"}`);
  add("crypto-b", `{"name": "@s/b", "private": true}`);
  mkdirSync(join(root, "packages/other"));
  return root;
}

function capture() {
  const out = { logs: [], errors: [] };
  out.log = (m) => out.logs.push(m);
  out.error = (m) => out.errors.push(m);
  return out;
}

describe("publishableDirs", () => {
  it("lists only public crypto-* packages", () => {
    const root = tree();
    assert.deepEqual(publishableDirs(root), [join(root, "packages/crypto-a")]);
  });
});

describe("runPublint", () => {
  it("reports each message with its type", async () => {
    const found = await runPublint(tinyPackage());
    assert.ok(found.length > 0);
    assert.ok(
      found.some((f) => /^publint error: .*missing\.js/.test(f)),
      found.join("\n"),
    );
  });
});

describe("pack", () => {
  it("packs with pnpm and returns the tarball path", () => {
    const dest = temp("pack-");
    const tarball = pack(tinyPackage(), dest);
    // realpath: macOS's temporary directory is behind a symlink.
    assert.equal(
      realpathSync(tarball),
      join(realpathSync(dest), "tiny-1.0.0.tgz"),
    );
  });
});

describe("runAttw", () => {
  it("is empty when attw passes", () => {
    assert.deepEqual(runAttw("x.tgz", fakeAttw(0, "fine")), []);
  });
  it("returns attw's report when it fails", () => {
    assert.deepEqual(runAttw("x.tgz", fakeAttw(1, "bad types")), [
      "attw:\nbad types\n",
    ]);
  });
});

describe("main", () => {
  it("passes when publint and attw find nothing", async () => {
    const out = capture();
    const seen = [];
    const code = await main([], {
      root: tree(),
      lint: async (dir) => (seen.push(dir), []),
      packTo: (dir, dest) => join(dest, "a.tgz"),
      types: (tarball) => (seen.push(tarball), []),
      ...out,
    });
    assert.equal(code, 0);
    assert.deepEqual(out.logs, ["packages: ok (1 packages, publint + attw)"]);
    assert.match(seen[0], /packages\/crypto-a$/);
    assert.match(seen[1], /check-packages-[^/]+\/a\.tgz$/);
    assert.equal(existsSync(join(seen[1], "..")), false, "work dir removed");
  });
  it("lists every problem by package and exits 1", async () => {
    const out = capture();
    const code = await main([], {
      root: tree(),
      lint: async () => ["publint warning: w"],
      packTo: () => "a.tgz",
      types: () => ["attw: t"],
      ...out,
    });
    assert.equal(code, 1);
    assert.deepEqual(out.errors, [
      "packages: boundary problems found",
      "  @s/a: publint warning: w",
      "  @s/a: attw: t",
    ]);
  });
  it("removes its work directory when a step throws", async () => {
    let work;
    const failing = main([], {
      root: tree(),
      lint: async () => [],
      packTo: (dir, dest) => {
        work = dest;
        throw new Error("pack failed");
      },
    });
    await assert.rejects(failing, /pack failed/);
    assert.equal(existsSync(work), false);
  });
});
