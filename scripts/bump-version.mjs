#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Opens the next lockstep iteration: moves the root manifest, all 18
// package manifests, CITATION.cff, the docs portal, the README and the
// committed OpenAPI document from the current version to the next one,
// and adds an "Unreleased" CHANGELOG section. The version moves
// strictly one step (+0.0.1), so
// the only argument is a check: `node scripts/bump-version.mjs 0.0.40`
// refuses anything but the next version. check-manifests.mjs remains
// the gate that every file agrees.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** The only version a release may move to from `current`. */
export function nextVersion(current) {
  const match = /^0\.0\.(\d+)$/.exec(current);
  if (!match) throw new Error(`not a 0.0.x version: ${current}`);
  return `0.0.${Number(match[1]) + 1}`;
}

function escape(version) {
  return version.replaceAll(".", "\\.");
}

/** Replace the manifest's `"version": "<from>"`, which must occur once. */
export function bumpManifest(text, from, to) {
  const pattern = new RegExp(`"version": "${escape(from)}"`, "g");
  const hits = text.match(pattern)?.length ?? 0;
  if (hits !== 1)
    throw new Error(`expected one "version": "${from}", found ${hits}`);
  return text.replace(pattern, `"version": "${to}"`);
}

/** Move CITATION.cff's version; date-released moves when the release is dated. */
export function bumpCitation(text, from, to) {
  const pattern = new RegExp(`^version: "${escape(from)}"$`, "m");
  if (!pattern.test(text)) throw new Error(`CITATION.cff is not at ${from}`);
  return text.replace(pattern, `version: "${to}"`);
}

/** Add an Unreleased section for `to` above the newest release. */
export function openChangelog(text, to) {
  if (text.includes(`## [${to}]`)) return text;
  const first = text.indexOf("\n## [");
  if (first === -1) throw new Error("CHANGELOG.md has no release heading");
  const section =
    `\n## [${to}] - Unreleased\n\n### Added\n\n` +
    `- **Lockstep release iteration**: Advance monorepo package manifests, ` +
    `root \`package.json\`, \`CITATION.cff\`, and \`CHANGELOG.md\` to ${to} ` +
    `in strict lockstep.\n`;
  return text.slice(0, first) + section + text.slice(first);
}

/** Replace every whole-word `from` (with or without a leading v). */
export function bumpText(text, from, to) {
  const pattern = new RegExp(
    `(?<![\\d.])(v?)${escape(from)}(?![\\d.]*\\d)`,
    "g",
  );
  return text.replace(pattern, `$1${to}`);
}

function edit(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after !== before) writeFileSync(path, after);
  return after !== before;
}

function manifestPaths(root) {
  const packages = readdirSync(`${root}packages`).filter((d) =>
    d.startsWith("crypto-"),
  );
  return ["package.json", ...packages.map((d) => `packages/${d}/package.json`)];
}

function textPaths(root) {
  const layouts = readdirSync(`${root}website/_layouts`).filter((f) =>
    f.endsWith(".html"),
  );
  return [
    ...layouts.map((f) => `website/_layouts/${f}`),
    "website/content/index.md",
    // info.version; export-openapi.mjs --check fails until it moves.
    "openapi/crypto-service.openapi.yaml",
  ];
}

/** Apply the bump under `root`; returns the paths it changed. */
export function bump(root, from, to) {
  const changed = [];
  const apply = (path, transform) => {
    if (edit(`${root}${path}`, transform)) changed.push(path);
  };
  manifestPaths(root).forEach((p) =>
    apply(p, (t) => bumpManifest(t, from, to)),
  );
  apply("CITATION.cff", (t) => bumpCitation(t, from, to));
  apply("CHANGELOG.md", (t) => openChangelog(t, to));
  textPaths(root).forEach((p) => apply(p, (t) => bumpText(t, from, to)));
  apply("README.md", (t) =>
    t.replace(`this tree is ${from}.`, `this tree is ${to}.`),
  );
  return changed;
}

function main(argv) {
  const from = JSON.parse(readFileSync(`${ROOT}package.json`, "utf8")).version;
  const to = nextVersion(from);
  if (argv[0] !== undefined && argv[0] !== to) {
    throw new Error(`${argv[0]} is not the next version after ${from} (${to})`);
  }
  const changed = bump(ROOT, from, to);
  console.log(`${from} -> ${to}: ${changed.length} files`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`bump-version: ${error.message}`);
    process.exit(1);
  }
}
