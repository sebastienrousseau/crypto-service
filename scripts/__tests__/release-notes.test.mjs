// SPDX-License-Identifier: Apache-2.0 OR MIT

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  checkHighlights,
  checksumsSection,
  composeNotes,
  highlightsSection,
  main,
  splitGenerated,
} from "../release-notes.mjs";

// Shaped like .github/release-highlights.md, multi-line comment included.
const HIGHLIGHTS = `<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->
<!-- release: v1.2.3 -->
<!--
  How to write this file.
-->

## Highlights ⭐️

- **First**: one sentence.
- **Second**: another sentence.
`;

const GENERATED = `## What's Changed
* feat: release v1.2.3 by @someone in https://github.com/o/r/pull/9

## New Contributors
* @someone made their first contribution in https://github.com/o/r/pull/9

**Full Changelog**: https://github.com/o/r/compare/v1.2.2...v1.2.3`;

function assets() {
  const dir = mkdtempSync(join(tmpdir(), "release-notes-"));
  const files = ["pkg-b-1.2.3.tgz", "pkg-a-1.2.3.tgz", "x.intoto.jsonl"];
  files.forEach((name) => writeFileSync(join(dir, name), name));
  return files.map((name) => join(dir, name));
}

describe("checkHighlights", () => {
  it("accepts highlights written for the tag", () => {
    assert.deepEqual(checkHighlights(HIGHLIGHTS, "v1.2.3"), []);
  });

  it("refuses highlights left from another release", () => {
    assert.deepEqual(checkHighlights(HIGHLIGHTS, "v1.2.4"), [
      "written for v1.2.3, not v1.2.4",
    ]);
  });

  it("refuses highlights with no release marker", () => {
    const text = HIGHLIGHTS.replace("<!-- release: v1.2.3 -->\n", "");
    assert.deepEqual(checkHighlights(text, "v1.2.3"), [
      "written for no release, not v1.2.3",
    ]);
  });

  it("refuses a missing heading, a wrong bullet count and em dashes", () => {
    const text = "<!-- release: v1.2.3 -->\n- **Only**: one — bullet\n";
    assert.deepEqual(checkHighlights(text, "v1.2.3"), [
      'no "## Highlights ⭐️" heading',
      "1 highlight bullets, expected 2 to 4",
      "contains an em dash",
    ]);
  });
});

describe("composeNotes", () => {
  it("keeps the template's section order", () => {
    const notes = composeNotes(HIGHLIGHTS, GENERATED, assets());
    const order = [
      "## Highlights ⭐️",
      "## What's Changed",
      "## New Contributors",
      "## Checksums",
      "**Full Changelog**: https://github.com/o/r/compare/v1.2.2...v1.2.3",
    ].map((heading) => notes.indexOf(heading));
    assert.ok(order.every((at, i) => at > (order[i - 1] ?? -1)));
    assert.ok(!notes.includes("<!--"));
    assert.match(notes, /^\* \*\*First\*\*: one sentence\.$/m);
  });

  it("refuses generated notes without the changes or the changelog link", () => {
    assert.throws(() => splitGenerated("nothing here"), /lack What's Changed/);
  });
});

describe("checksumsSection", () => {
  it("lists every asset, sorted, in the form release-assets.sh reads", () => {
    const lines = checksumsSection(assets()).split("\n");
    const sums = lines.filter((line) => /^[0-9a-f]{64}  /.test(line));
    assert.deepEqual(
      sums.map((line) => line.slice(66)),
      ["pkg-a-1.2.3.tgz", "pkg-b-1.2.3.tgz", "x.intoto.jsonl"],
    );
    // The pattern scripts/release-assets.sh uses to find tarball sums.
    const tarballs = sums.filter((line) =>
      /^[0-9a-f]{64}  [A-Za-z0-9._-]+\.tgz$/.test(line),
    );
    assert.equal(tarballs.length, 2);
  });
});

describe("highlightsSection", () => {
  it("drops comments and uses * bullets", () => {
    assert.equal(
      highlightsSection(HIGHLIGHTS),
      "## Highlights ⭐️\n\n* **First**: one sentence.\n* **Second**: another sentence.",
    );
  });

  it("refuses a comment that is never closed", () => {
    assert.throws(
      () => highlightsSection("<!<!---->-- x\n## Highlights ⭐️"),
      /unclosed comment/,
    );
  });
});

describe("main", () => {
  function files() {
    const dir = mkdtempSync(join(tmpdir(), "release-main-"));
    const highlightsFile = join(dir, "highlights.md");
    const generated = join(dir, "generated.md");
    writeFileSync(highlightsFile, HIGHLIGHTS);
    writeFileSync(generated, GENERATED);
    return { highlightsFile, generated };
  }
  const USAGE =
    /^Error: usage: release-notes\.mjs check\|compose <vX\.Y\.Z> \.\.\.$/;

  it("check accepts highlights written for the tag", () => {
    const logs = [];
    const { highlightsFile } = files();
    const log = (m) => logs.push(m);
    assert.equal(main(["check", "v1.2.3"], { highlightsFile, log }), 0);
    assert.deepEqual(logs, ["release-notes: highlights ready for v1.2.3"]);
  });
  it("compose prints the notes", () => {
    const logs = [];
    const { highlightsFile, generated } = files();
    const argv = ["compose", "v1.2.3", generated, ...assets()];
    assert.equal(main(argv, { highlightsFile, log: (m) => logs.push(m) }), 0);
    assert.equal(logs.length, 1);
    assert.match(
      logs[0],
      /^## Highlights ⭐️[\s\S]*## Checksums[\s\S]*\*\*Full/,
    );
  });
  it("refuses a missing or malformed tag", () => {
    const { highlightsFile } = files();
    assert.throws(() => main(["check"], { highlightsFile }), USAGE);
    assert.throws(() => main(["check", "1.2.3"], { highlightsFile }), USAGE);
  });
  it("refuses highlights for another tag", () => {
    const { highlightsFile } = files();
    assert.throws(
      () => main(["check", "v1.2.4"], { highlightsFile }),
      /^Error: \.github\/release-highlights\.md: written for v1\.2\.3, not v1\.2\.4$/,
    );
  });
  it("refuses compose without assets, or an unknown command", () => {
    const { highlightsFile, generated } = files();
    const run = (argv) => () => main(argv, { highlightsFile });
    assert.throws(run(["compose", "v1.2.3", generated]), USAGE);
    assert.throws(run(["publish", "v1.2.3"]), USAGE);
  });
});
