#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Release notes in the house template: Highlights (written by hand in
// .github/release-highlights.md), What's Changed and New Contributors
// (from GitHub's generated notes), Checksums (the SHA-256 of every
// asset) and the Full Changelog link.
//
//   release-notes.mjs check <tag>
//     Refuse a tag whose highlights file is for another version, has no
//     "## Highlights ⭐️" heading, has fewer than 2 or more than 4
//     "**Headline**: text" bullets, or contains an em dash.
//   release-notes.mjs compose <tag> <generated-notes.md> <asset>...
//     Print the notes for <tag>.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const HIGHLIGHTS = new URL("../.github/release-highlights.md", import.meta.url);
const HEADING = "## Highlights ⭐️";
const BULLET = /^[*-] \*\*[^*]+\*\*:? \S/;

/** The highlights file's problems for `tag`; empty when it is usable. */
export function checkHighlights(text, tag) {
  const problems = [];
  const marker = text.match(/<!-- release: (\S+) -->/)?.[1];
  if (marker !== tag) {
    problems.push(`written for ${marker ?? "no release"}, not ${tag}`);
  }
  if (!text.split("\n").includes(HEADING)) {
    problems.push(`no "${HEADING}" heading`);
  }
  const bullets = text.split("\n").filter((line) => BULLET.test(line));
  if (bullets.length < 2 || bullets.length > 4) {
    problems.push(`${bullets.length} highlight bullets, expected 2 to 4`);
  }
  if (text.includes("—")) problems.push("contains an em dash");
  return problems;
}

/** The Highlights section: no comments, `*` bullets, ready to print. */
export function highlightsSection(text) {
  // Repeat until nothing changes: removing one comment can join the
  // text around it into a new "<!--".
  let stripped = text;
  let previous;
  do {
    previous = stripped;
    stripped = stripped.replace(/<!--[\s\S]*?-->/g, "");
  } while (stripped !== previous);
  if (stripped.includes("<!--")) {
    throw new Error("highlights contain an unclosed comment");
  }
  return stripped
    .split("\n")
    .map((line) => line.replace(/^- /, "* "))
    .join("\n")
    .trim();
}

/** Split GitHub's generated notes into the changes and the changelog line. */
export function splitGenerated(text) {
  const start = text.indexOf("## What's Changed");
  const link = text.match(/^\*\*Full Changelog\*\*: \S+$/m);
  if (start === -1 || link === null) {
    throw new Error("generated notes lack What's Changed or Full Changelog");
  }
  return {
    changes: text.slice(start, link.index).trim(),
    fullChangelog: link[0],
  };
}

/** The Checksums section for `files`, sorted by asset name. */
export function checksumsSection(files) {
  const lines = files
    .map((file) => {
      const digest = createHash("sha256").update(readFileSync(file));
      return `${digest.digest("hex")}  ${basename(file)}`;
    })
    .sort((a, b) => a.slice(66).localeCompare(b.slice(66)));
  return [
    "## Checksums",
    "",
    "SHA-256 of every asset attached to this release:",
    "",
    "```text",
    ...lines,
    "```",
  ].join("\n");
}

/** The full release notes. */
export function composeNotes(highlights, generated, files) {
  const { changes, fullChangelog } = splitGenerated(generated);
  return [
    highlightsSection(highlights),
    changes,
    checksumsSection(files),
    fullChangelog,
  ].join("\n\n");
}

function main([command, tag, generated, ...files]) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? "")) {
    throw new Error("usage: release-notes.mjs check|compose <vX.Y.Z> ...");
  }
  const highlights = readFileSync(HIGHLIGHTS, "utf8");
  const problems = checkHighlights(highlights, tag);
  if (problems.length > 0) {
    throw new Error(`.github/release-highlights.md: ${problems.join("; ")}`);
  }
  if (command === "check") {
    highlightsSection(highlights);
    console.log(`release-notes: highlights ready for ${tag}`);
  } else if (command === "compose" && files.length > 0) {
    console.log(
      composeNotes(highlights, readFileSync(generated, "utf8"), files),
    );
  } else {
    throw new Error("usage: release-notes.mjs check|compose <vX.Y.Z> ...");
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`release-notes: ${error.message}`);
    process.exit(1);
  }
}
