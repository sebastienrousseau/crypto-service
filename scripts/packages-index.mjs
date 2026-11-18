#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Generate the package table and dependency list in packages/README.md
// from each package's package.json (name, description and workspace
// dependencies), so the index cannot drift from the manifests that npm
// publishes. With --check it exits 1 when the file is out of date.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import { runIfMain } from "./lib/cli.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BEGIN = "<!-- BEGIN GENERATED: scripts/packages-index.mjs -->";
const END = "<!-- END GENERATED -->";

/** Each package's manifest under `root`, with its directory name. */
function readManifests(root) {
  return readdirSync(`${root}packages`)
    .filter((d) => d.startsWith("crypto-"))
    .sort()
    .map((dir) => ({
      dir,
      ...JSON.parse(
        readFileSync(`${root}packages/${dir}/package.json`, "utf8"),
      ),
    }));
}

/** Workspace packages this one depends on at runtime. */
const internalDeps = (m) =>
  Object.keys(m.dependencies ?? {})
    .filter((d) => d.startsWith("@sebastienrousseau/crypto-"))
    .map((d) => d.replace("@sebastienrousseau/", ""))
    .sort();

const escape = (text) => text.replaceAll("|", "\\|");

/** The generated block, markers included, for `manifests`. */
export function generate(manifests) {
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
  return [
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
}

/** Rewrite or (`--check`) verify packages/README.md; resolves to the exit code. */
export async function main(
  argv,
  { root = ROOT, log = console.log, error = console.error } = {},
) {
  const readme = `${root}packages/README.md`;
  const manifests = readManifests(root);
  const current = readFileSync(readme, "utf8");
  const start = current.indexOf(BEGIN);
  const end = current.indexOf(END);
  if (start === -1 || end === -1) {
    error(`packages-index: markers missing in ${readme}`);
    return 1;
  }
  // Format as the repository's Prettier config would, so a formatted file
  // and a freshly generated one compare equal.
  const next = await prettier.format(
    current.slice(0, start) +
      generate(manifests) +
      current.slice(end + END.length),
    { ...(await prettier.resolveConfig(readme)), filepath: readme },
  );
  if (!argv.includes("--check")) {
    writeFileSync(readme, next);
    log(`packages-index: wrote ${manifests.length} packages`);
    return 0;
  }
  if (next !== current) {
    error(
      "packages-index: packages/README.md is out of date; run node scripts/packages-index.mjs",
    );
    return 1;
  }
  log(`packages-index: ok (${manifests.length} packages)`);
  return 0;
}

await runIfMain(import.meta.url, main, { name: "packages-index" });
