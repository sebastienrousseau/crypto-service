// SPDX-License-Identifier: Apache-2.0 OR MIT

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  bump,
  bumpCitation,
  bumpManifest,
  bumpText,
  nextVersion,
  openChangelog,
} from "../bump-version.mjs";

const CHANGELOG = `# Changelog\n\nIntro.\n\n## [1.0.0] - 2026-01-01\n\n- old\n`;

describe("nextVersion", () => {
  it("moves exactly one step", () => {
    assert.equal(nextVersion("0.0.39"), "0.0.40");
    assert.equal(nextVersion("0.0.999"), "0.0.1000");
  });
  it("refuses anything that is not 0.0.x", () => {
    assert.throws(() => nextVersion("0.1.0"), /not a 0\.0\.x version/);
    assert.throws(() => nextVersion("v0.0.1"), /not a 0\.0\.x version/);
  });
});

describe("bumpManifest", () => {
  it("replaces the single version field", () => {
    const out = bumpManifest(
      `{\n  "version": "0.0.39",\n  "x": 1\n}`,
      "0.0.39",
      "0.0.40",
    );
    assert.match(out, /"version": "0.0.40"/);
  });
  it("refuses a manifest at another version or with two fields", () => {
    assert.throws(
      () => bumpManifest(`{"version": "0.0.38"}`, "0.0.39", "0.0.40"),
      /found 0/,
    );
    const twice = `"version": "0.0.39" "version": "0.0.39"`;
    assert.throws(() => bumpManifest(twice, "0.0.39", "0.0.40"), /found 2/);
  });
});

describe("bumpCitation", () => {
  it("moves the version line only", () => {
    const cff = `version: "0.0.39"\ndate-released: "2026-10-25"\n`;
    assert.equal(
      bumpCitation(cff, "0.0.39", "0.0.40"),
      `version: "0.0.40"\ndate-released: "2026-10-25"\n`,
    );
  });
  it("refuses a file at another version", () => {
    assert.throws(
      () => bumpCitation(`version: "0.0.1"\n`, "0.0.39", "0.0.40"),
      /not at/,
    );
  });
});

describe("openChangelog", () => {
  it("adds an Unreleased section above the newest release", () => {
    const out = openChangelog(CHANGELOG, "1.0.1");
    assert.ok(
      out.indexOf("## [1.0.1] - Unreleased") < out.indexOf("## [1.0.0]"),
    );
    assert.match(out, /to 1\.0\.1 in strict lockstep/);
  });
  it("is idempotent", () => {
    const once = openChangelog(CHANGELOG, "1.0.1");
    assert.equal(openChangelog(once, "1.0.1"), once);
  });
  it("refuses a changelog with no release", () => {
    assert.throws(
      () => openChangelog("# Changelog\n", "1.0.1"),
      /no release heading/,
    );
  });
});

describe("bumpText", () => {
  it("replaces whole versions, with or without v", () => {
    assert.equal(
      bumpText("v0.0.39 and 0.0.39.", "0.0.39", "0.0.40"),
      "v0.0.40 and 0.0.40.",
    );
  });
  it("leaves longer versions alone", () => {
    assert.equal(
      bumpText("0.0.390 10.0.39 0.0.39.1", "0.0.39", "0.0.40"),
      "0.0.390 10.0.39 0.0.39.1",
    );
  });
});

describe("bump", () => {
  function tree() {
    const root = `${mkdtempSync(join(tmpdir(), "bump-"))}/`;
    mkdirSync(join(root, "packages/crypto-a"), { recursive: true });
    mkdirSync(join(root, "website/_layouts"), { recursive: true });
    mkdirSync(join(root, "website/content"), { recursive: true });
    writeFileSync(join(root, "package.json"), `{"version": "0.0.1"}`);
    writeFileSync(
      join(root, "packages/crypto-a/package.json"),
      `{"version": "0.0.1"}`,
    );
    writeFileSync(join(root, "CITATION.cff"), `version: "0.0.1"\n`);
    writeFileSync(join(root, "CHANGELOG.md"), CHANGELOG);
    writeFileSync(join(root, "website/_layouts/a.html"), "<b>v0.0.1</b>");
    writeFileSync(join(root, "website/_layouts/notes.txt"), "v0.0.1");
    writeFileSync(join(root, "website/content/index.md"), "same");
    writeFileSync(join(root, "README.md"), "this tree is 0.0.1.");
    mkdirSync(join(root, "openapi"));
    writeFileSync(
      join(root, "openapi/crypto-service.openapi.yaml"),
      'info:\n  version: "0.0.1"\n',
    );
    return root;
  }

  it("moves every file and reports what changed", () => {
    const root = tree();
    const changed = bump(root, "0.0.1", "0.0.2");
    assert.deepEqual(changed, [
      "package.json",
      "packages/crypto-a/package.json",
      "CITATION.cff",
      "CHANGELOG.md",
      "website/_layouts/a.html",
      "openapi/crypto-service.openapi.yaml",
      "README.md",
    ]);
    assert.equal(
      readFileSync(join(root, "openapi/crypto-service.openapi.yaml"), "utf8"),
      'info:\n  version: "0.0.2"\n',
    );
    assert.equal(
      readFileSync(join(root, "website/_layouts/a.html"), "utf8"),
      "<b>v0.0.2</b>",
    );
    assert.equal(
      readFileSync(join(root, "website/_layouts/notes.txt"), "utf8"),
      "v0.0.1",
    );
    assert.equal(
      readFileSync(join(root, "README.md"), "utf8"),
      "this tree is 0.0.2.",
    );
  });
});
