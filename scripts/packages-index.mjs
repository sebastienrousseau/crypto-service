#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Generate the package table and dependency list in packages/README.md
// from each package's package.json (name, description and workspace
// dependencies), so the index cannot drift from the manifests that npm
// publishes. With --check it exits 1 when the file is out of date.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import prettier from "prettier";

const ROOT = new URL("..", import.meta.url).pathname;
const README = `${ROOT}packages/README.md`;
const BEGIN = "<!-- BEGIN GENERATED: scripts/packages-index.mjs -->";
const END = "<!-- END GENERATED -->";

const manifests = readdirSync(`${ROOT}packages`)
  .filter((d) => d.startsWith("crypto-"))
  .sort()
  .map((dir) => ({
    dir,
    ...JSON.parse(readFileSync(`${ROOT}packages/${dir}/package.json`, "utf8")),
  }));

/** Workspace packages this one depends on at runtime. */
const internalDeps = (m) =>
  Object.keys(m.dependencies ?? {})
    .filter((d) => d.startsWith("@sebastienrousseau/crypto-"))
    .map((d) => d.replace("@sebastienrousseau/", ""))
    .sort();

const escape = (text) => text.replaceAll("|", "\\|");

const table = [
  "| Package | Description |",
  "| :------ | :---------- |",
  ...manifests.map(
    (m) => `| [\`${m.dir}\`](${m.dir}/) | ${escape(m.description)} |`,
  ),
];

const deps = manifests.map((m) => {
  const d = internalDeps(m);
  return `- \`${m.dir}\`: ${d.length ? d.map((x) => `\`${x}\``).join(", ") : "no workspace dependencies"}`;
});

const generated = [
  BEGIN,
  "",
  `All ${manifests.length} packages share one version; descriptions are the`,
  "ones published to npm.",
  "",
  ...table,
  "",
  "### Workspace dependencies",
  "",
  ...deps,
  "",
  END,
].join("\n");

const current = readFileSync(README, "utf8");
const start = current.indexOf(BEGIN);
const end = current.indexOf(END);
if (start === -1 || end === -1) {
  console.error(`packages-index: markers missing in ${README}`);
  process.exit(1);
}
// Format as the repository's Prettier config would, so a formatted file
// and a freshly generated one compare equal.
const next = await prettier.format(
  current.slice(0, start) + generated + current.slice(end + END.length),
  { ...(await prettier.resolveConfig(README)), filepath: README },
);

if (process.argv.includes("--check")) {
  if (next !== current) {
    console.error(
      "packages-index: packages/README.md is out of date; run node scripts/packages-index.mjs",
    );
    process.exit(1);
  }
  console.log(`packages-index: ok (${manifests.length} packages)`);
} else {
  writeFileSync(README, next);
  console.log(`packages-index: wrote ${manifests.length} packages`);
}
