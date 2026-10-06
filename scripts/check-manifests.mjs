#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Release-readiness check for every publishable package manifest:
// lockstep version, a repository field that npm provenance accepts
// (it must match the GitHub repository the release workflow runs in),
// public access, and a dist-only file list. With --tag vX.Y.Z it also
// checks that the tag matches the version being published.

import { readFileSync, readdirSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const REPO_URL = "git+https://github.com/sebastienrousseau/crypto-service.git";

const rootVersion = JSON.parse(
  readFileSync(`${ROOT}package.json`, "utf8"),
).version;
const tagArg = process.argv.indexOf("--tag");
const tag = tagArg !== -1 ? process.argv[tagArg + 1] : undefined;

const problems = [];
if (tag !== undefined && tag !== `v${rootVersion}`) {
  problems.push(`tag ${tag} does not match version v${rootVersion}`);
}

const cffContent = readFileSync(`${ROOT}CITATION.cff`, "utf8");
const cffMatch = cffContent.match(/^version:\s*"?([^"\r\n]+)"?/m);
if (cffMatch && cffMatch[1] !== rootVersion) {
  problems.push(`CITATION.cff: version ${cffMatch[1]}, expected ${rootVersion}`);
}

const dirs = readdirSync(`${ROOT}packages`).filter((d) =>
  d.startsWith("crypto-"),
);
for (const dir of dirs) {
  const pkg = JSON.parse(
    readFileSync(`${ROOT}packages/${dir}/package.json`, "utf8"),
  );
  if (pkg.private) continue;
  const where = `${pkg.name} (packages/${dir})`;
  if (pkg.version !== rootVersion) {
    problems.push(`${where}: version ${pkg.version}, expected ${rootVersion}`);
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
}

if (problems.length > 0) {
  console.error("manifests: not ready to publish");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`manifests: ok (${dirs.length} packages at ${rootVersion})`);
