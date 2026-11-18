// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  main,
  manifestProblems,
  releaseProblems,
  tagOf,
} from "../check-manifests.mjs";

const REPO_URL = "git+https://github.com/sebastienrousseau/crypto-service.git";
const CFF = 'version: "1.2.3"\ndate-released: "2026-01-02"\n';
const CHANGELOG = "# Changelog\n\n## [1.2.3] - 2026-01-02\n";

/** A publishable manifest that passes every check. */
function good(dir = "crypto-a", overrides = {}) {
  return {
    name: `@s/${dir}`,
    version: "1.2.3",
    repository: { url: REPO_URL, directory: `packages/${dir}` },
    publishConfig: { access: "public" },
    files: ["dist", "README.md"],
    ...overrides,
  };
}

describe("tagOf", () => {
  it("reads --tag <tag>, or nothing", () => {
    assert.equal(tagOf(["--tag", "v1"]), "v1");
    assert.equal(tagOf([]), undefined);
  });
});

describe("releaseProblems", () => {
  const ok = { version: "1.2.3", cff: CFF, changelog: CHANGELOG };

  it("passes a dated release with or without its tag", () => {
    assert.deepEqual(releaseProblems(ok), []);
    assert.deepEqual(releaseProblems({ ...ok, tag: "v1.2.3" }), []);
  });
  it("refuses a tag for another version", () => {
    assert.deepEqual(releaseProblems({ ...ok, tag: "v1.2.4" }), [
      "tag v1.2.4 does not match version v1.2.3",
    ]);
  });
  it("refuses CITATION.cff at another version or date", () => {
    const cff = 'version: 1.2.2\ndate-released: "2026-01-01"\n';
    assert.deepEqual(releaseProblems({ ...ok, cff }), [
      "CITATION.cff: version 1.2.2, expected 1.2.3",
      "CITATION.cff: date-released 2026-01-01, expected 2026-01-02 (CHANGELOG)",
    ]);
  });
  it("ignores a CITATION.cff with no version field", () => {
    const cff = 'date-released: "2026-01-02"\n';
    assert.deepEqual(releaseProblems({ ...ok, cff }), []);
  });
  it("refuses a CHANGELOG without the version's heading", () => {
    assert.deepEqual(releaseProblems({ ...ok, changelog: "# Changelog\n" }), [
      'CHANGELOG.md: no "## [1.2.3]" heading',
    ]);
  });
  it("allows an Unreleased heading until the version is tagged", () => {
    const changelog = "## [1.2.3] - Unreleased\n";
    assert.deepEqual(releaseProblems({ ...ok, changelog }), []);
    assert.deepEqual(releaseProblems({ ...ok, changelog, tag: "v1.2.3" }), [
      'CHANGELOG.md: [1.2.3] is "Unreleased", not a date',
    ]);
  });
});

describe("manifestProblems", () => {
  it("passes a ready manifest and skips a private one", () => {
    assert.deepEqual(manifestProblems(good(), "crypto-a", "1.2.3"), []);
    assert.deepEqual(
      manifestProblems({ private: true }, "crypto-a", "1.2.3"),
      [],
    );
  });
  it("lists every fault", () => {
    const pkg = good("crypto-a", {
      version: "1.2.2",
      repository: undefined,
      publishConfig: undefined,
      files: ["src"],
    });
    const where = "@s/crypto-a (packages/crypto-a)";
    assert.deepEqual(manifestProblems(pkg, "crypto-a", "1.2.3"), [
      `${where}: version 1.2.2, expected 1.2.3`,
      `${where}: repository.url is undefined, expected ${REPO_URL}`,
      `${where}: repository.directory is undefined`,
      `${where}: publishConfig.access must be "public"`,
      `${where}: files must list the dist output`,
    ]);
  });
  it("needs a files array", () => {
    const pkg = good("crypto-a", { files: undefined });
    assert.deepEqual(manifestProblems(pkg, "crypto-a", "1.2.3"), [
      "@s/crypto-a (packages/crypto-a): files must list the dist output",
    ]);
  });
});

describe("main", () => {
  function tree(pkg = good()) {
    const root = `${mkdtempSync(join(tmpdir(), "manifests-"))}/`;
    mkdirSync(join(root, "packages/crypto-a"), { recursive: true });
    mkdirSync(join(root, "packages/other"));
    writeFileSync(join(root, "package.json"), `{"version": "1.2.3"}`);
    writeFileSync(join(root, "CITATION.cff"), CFF);
    writeFileSync(join(root, "CHANGELOG.md"), CHANGELOG);
    writeFileSync(
      join(root, "packages/crypto-a/package.json"),
      JSON.stringify(pkg),
    );
    return root;
  }
  function capture() {
    const out = { logs: [], errors: [] };
    out.log = (m) => out.logs.push(m);
    out.error = (m) => out.errors.push(m);
    return out;
  }

  it("passes a ready tree", () => {
    const out = capture();
    assert.equal(main(["--tag", "v1.2.3"], { root: tree(), ...out }), 0);
    assert.deepEqual(out.logs, ["manifests: ok (1 packages at 1.2.3)"]);
  });
  it("lists the problems and exits 1", () => {
    const out = capture();
    const root = tree(good("crypto-a", { version: "1.2.2" }));
    assert.equal(main(["--tag", "v1.2.4"], { root, ...out }), 1);
    assert.deepEqual(out.errors, [
      "manifests: not ready to publish",
      "  tag v1.2.4 does not match version v1.2.3",
      "  @s/crypto-a (packages/crypto-a): version 1.2.2, expected 1.2.3",
    ]);
  });
  it("passes on the committed tree", () => {
    const out = capture();
    assert.equal(main([], out), 0, out.errors.join("\n"));
  });
});
