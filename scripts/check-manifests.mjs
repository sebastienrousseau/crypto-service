#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Release-readiness check for every publishable package manifest:
// lockstep version, a repository field that npm provenance accepts
// (it must match the GitHub repository the release workflow runs in),
// public access, and a dist-only file list. With --tag vX.Y.Z it also
// checks that the tag matches the version being published.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runIfMain } from "./lib/cli.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO_URL = "git+https://github.com/sebastienrousseau/crypto-service.git";

/** The `--tag <tag>` argument, if any. */
export function tagOf(argv) {
  const at = argv.indexOf("--tag");
  return at !== -1 ? argv[at + 1] : undefined;
}

/**
 * date-released must name the day this version shipped: the date on its
 * CHANGELOG heading. A release must carry that date, not "Unreleased".
 */
function dateProblems({ version, tag, cff, changelog }) {
  const cffDate = cff.match(/^date-released:\s*"?([^"\r\n]+)"?/m)?.[1];
  const heading = changelog.match(
    new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\] - (.+)$`, "m"),
  );
  const releaseDate = heading?.[1].trim();
  if (releaseDate === undefined) {
    return [`CHANGELOG.md: no "## [${version}]" heading`];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return cffDate === releaseDate
      ? []
      : [
          `CITATION.cff: date-released ${cffDate}, expected ${releaseDate} (CHANGELOG)`,
        ];
  }
  return tag === undefined
    ? []
    : [`CHANGELOG.md: [${version}] is "${releaseDate}", not a date`];
}

/** Problems with the tag, CITATION.cff and the CHANGELOG heading for `version`. */
export function releaseProblems(release) {
  const { version, tag, cff } = release;
  const problems = [];
  if (tag !== undefined && tag !== `v${version}`) {
    problems.push(`tag ${tag} does not match version v${version}`);
  }
  const cffVersion = cff.match(/^version:\s*"?([^"\r\n]+)"?/m)?.[1];
  if (cffVersion !== undefined && cffVersion !== version) {
    problems.push(`CITATION.cff: version ${cffVersion}, expected ${version}`);
  }
  return [...problems, ...dateProblems(release)];
}

/** Problems with one package manifest in `packages/<dir>`. */
export function manifestProblems(pkg, dir, version) {
  if (pkg.private) return [];
  const where = `${pkg.name} (packages/${dir})`;
  const problems = [];
  if (pkg.version !== version) {
    problems.push(`${where}: version ${pkg.version}, expected ${version}`);
  }
  const repo = pkg.repository ?? {};
  if (repo.url !== REPO_URL) {
    problems.push(
      `${where}: repository.url is ${JSON.stringify(repo.url)}, expected ${REPO_URL}`,
    );
  }
  if (repo.directory !== `packages/${dir}`) {
    problems.push(
      `${where}: repository.directory is ${JSON.stringify(repo.directory)}`,
    );
  }
  if (pkg.publishConfig?.access !== "public") {
    problems.push(`${where}: publishConfig.access must be "public"`);
  }
  if (
    !Array.isArray(pkg.files) ||
    !pkg.files.some((f) => f.startsWith("dist"))
  ) {
    problems.push(`${where}: files must list the dist output`);
  }
  return problems;
}

/** Check every manifest under `root`; returns the exit code. */
export function main(
  argv,
  { root = ROOT, log = console.log, error = console.error } = {},
) {
  const read = (path) => readFileSync(`${root}${path}`, "utf8");
  const version = JSON.parse(read("package.json")).version;
  const problems = releaseProblems({
    version,
    tag: tagOf(argv),
    cff: read("CITATION.cff"),
    changelog: read("CHANGELOG.md"),
  });
  const dirs = readdirSync(`${root}packages`).filter((d) =>
    d.startsWith("crypto-"),
  );
  for (const dir of dirs) {
    const pkg = JSON.parse(read(`packages/${dir}/package.json`));
    problems.push(...manifestProblems(pkg, dir, version));
  }
  if (problems.length > 0) {
    error("manifests: not ready to publish");
    for (const p of problems) error(`  ${p}`);
    return 1;
  }
  log(`manifests: ok (${dirs.length} packages at ${version})`);
  return 0;
}

await runIfMain(import.meta.url, main, { name: "check-manifests" });
