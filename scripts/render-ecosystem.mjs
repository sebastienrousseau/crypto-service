#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Renders the README's table of suite members outside this repository
// (the language SDKs and the site) from docs/ecosystem.json, between
// the <!-- ecosystem:start --> and <!-- ecosystem:end --> markers, so
// the README cannot list a member the inventory does not, or miss one.
//
//   node scripts/render-ecosystem.mjs           # rewrite README.md
//   node scripts/render-ecosystem.mjs --check   # exit 1 if it would change

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const START = "<!-- ecosystem:start -->";
const END = "<!-- ecosystem:end -->";

const REGISTRY = {
  maven: (id) => {
    const [group, artifact] = id.split(":");
    return `[Maven Central](https://central.sonatype.com/artifact/${group}/${artifact})`;
  },
  crates: (id) => `[crates.io](https://crates.io/crates/${id})`,
  go: (id) => `[Go module proxy](https://pkg.go.dev/${id})`,
  nuget: (id) => `[NuGet](https://www.nuget.org/packages/${id})`,
  pypi: (id) => `[PyPI](https://pypi.org/project/${id}/)`,
  "github-release": () => "GitHub release (CMake package)",
  none: () => "None (website)",
};

/** One table row for a member outside this repository. */
export function row(member, owner) {
  const link = `[\`${member.name}\`](https://github.com/${owner}/${member.repo})`;
  const id = member.registry.ids[0];
  const where = REGISTRY[member.registry.type](id);
  const pkg = id === undefined ? "" : ` \`${id}\``;
  return `| ${link} | ${member.language} | ${member.purpose} | ${where}${pkg} |`;
}

/** The generated block, markers included. */
export function render(ecosystem) {
  const rows = ecosystem.members
    .filter((m) => m.kind !== "core")
    .map((m) => row(m, ecosystem.owner));
  return [
    START,
    "",
    "| Member | Language | Purpose | Registry |",
    "| :--- | :--- | :--- | :--- |",
    ...rows,
    "",
    END,
  ].join("\n");
}

/** `readme` with its generated block replaced. */
export function replaceBlock(readme, block) {
  const from = readme.indexOf(START);
  const to = readme.indexOf(END);
  if (from === -1 || to < from)
    throw new Error("README.md has no ecosystem markers");
  return readme.slice(0, from) + block + readme.slice(to + END.length);
}

function main(argv) {
  const ecosystem = JSON.parse(
    readFileSync(`${ROOT}docs/ecosystem.json`, "utf8"),
  );
  const path = `${ROOT}README.md`;
  const before = readFileSync(path, "utf8");
  const after = replaceBlock(before, render(ecosystem));
  if (argv.includes("--check")) {
    if (after !== before) {
      console.error(
        "render-ecosystem: README.md is out of date; run `node scripts/render-ecosystem.mjs`",
      );
      return false;
    }
    console.log("render-ecosystem: ok");
    return true;
  }
  writeFileSync(path, after);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main(process.argv.slice(2)) ? 0 : 1);
  } catch (error) {
    console.error(`render-ecosystem: ${error.message}`);
    process.exit(2);
  }
}
