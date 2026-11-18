#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Suite consistency check (docs/adr/0005-suite-lockstep-with-sdks-and-site.md).
// For every member of docs/ecosystem.json it verifies, at one version:
// the signed tag v<version>, the GitHub release and its required assets
// (core: its "## Checksums" section), the registry publication, and for
// the site its VERSION file. It reads only public endpoints; GITHUB_TOKEN
// is used when set, to raise the API rate limit.
//
//   node scripts/check-ecosystem.mjs              # version from package.json
//   node scripts/check-ecosystem.mjs --version 0.0.40

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runIfMain } from "./lib/cli.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const USER_AGENT = "crypto-service-suite-check";

/** Registry URLs that answer 200 once `id` is published at `version`. */
export function registryUrls(registry, version) {
  const build = {
    npm: (id) => `https://registry.npmjs.org/${id}/${version}`,
    crates: (id) => `https://crates.io/api/v1/crates/${id}/${version}`,
    maven: (id) => {
      const [group, artifact] = id.split(":");
      const dir = `${group.replaceAll(".", "/")}/${artifact}/${version}`;
      return `https://repo1.maven.org/maven2/${dir}/${artifact}-${version}.pom`;
    },
    nuget: (id) => {
      const lower = id.toLowerCase();
      return `https://api.nuget.org/v3-flatcontainer/${lower}/${version}/${lower}.nuspec`;
    },
    pypi: (id) => `https://pypi.org/pypi/${id}/${version}/json`,
    go: (id) =>
      `https://proxy.golang.org/${id.toLowerCase()}/@v/v${version}.info`,
  }[registry.type];
  if (build === undefined) return [];
  return registry.ids.map((id) => ({ id, url: build(id) }));
}

/** The member's required asset names at `version`. */
export function requiredAssets(member, version) {
  return (member.releaseAssets ?? []).map((a) =>
    a.replaceAll("${version}", version),
  );
}

async function checkTag(member, version, deps) {
  const base = `repos/${deps.owner}/${member.repo}/git`;
  const ref = await deps.github(`${base}/ref/tags/v${version}`);
  if (ref === null) return [`no tag v${version}`];
  if (ref.object.type !== "tag") return [`tag v${version} is not annotated`];
  const tag = await deps.github(`${base}/tags/${ref.object.sha}`);
  return tag?.verification?.verified === true
    ? []
    : [`tag v${version} has no verified signature`];
}

async function checkRelease(member, version, deps) {
  const path = `repos/${deps.owner}/${member.repo}/releases/tags/v${version}`;
  const release = await deps.github(path);
  if (release === null) return [`no GitHub release v${version}`];
  const names = new Set(release.assets.map((a) => a.name));
  const missing = requiredAssets(member, version).filter((a) => !names.has(a));
  const problems = missing.map((a) => `release v${version} lacks ${a}`);
  if (
    member.kind === "core" &&
    !String(release.body).includes("## Checksums")
  ) {
    problems.push(`release v${version} has no Checksums section`);
  }
  return problems;
}

async function checkRegistry(member, version, deps) {
  const problems = [];
  for (const { id, url } of registryUrls(member.registry, version)) {
    if (!(await deps.exists(url))) {
      problems.push(`${id} ${version} not on ${member.registry.type}`);
    }
  }
  return problems;
}

async function checkVersionFile(member, version, deps) {
  const path = `repos/${deps.owner}/${member.repo}/contents/${member.versionFile}`;
  const file = await deps.github(path);
  if (file === null) return [`no ${member.versionFile}`];
  const found = Buffer.from(file.content, "base64").toString("utf8").trim();
  return found === version ? [] : [`${member.versionFile} is ${found}`];
}

/** Every problem with one member at `version` (empty when consistent). */
export async function checkMember(member, version, deps) {
  const checks = [checkTag(member, version, deps)];
  if (member.kind === "site") {
    checks.push(checkVersionFile(member, version, deps));
  } else {
    checks.push(checkRelease(member, version, deps));
    checks.push(checkRegistry(member, version, deps));
  }
  return (await Promise.all(checks)).flat();
}

/** Check every member; returns `{ name, problems }` per member. */
export async function checkEcosystem(ecosystem, version, deps) {
  const owner = ecosystem.owner;
  return Promise.all(
    ecosystem.members.map(async (member) => ({
      name: member.name,
      problems: await checkMember(member, version, { ...deps, owner }),
    })),
  );
}

/** A GitHub API GET returning parsed JSON, or null for 404. */
export function githubClient(token, fetchImpl = fetch) {
  return async (path) => {
    const headers = {
      accept: "application/vnd.github+json",
      "user-agent": USER_AGENT,
    };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetchImpl(`https://api.github.com/${path}`, { headers });
    // 404: no such object; 409: the repository is still empty.
    if (res.status === 404 || res.status === 409) return null;
    if (!res.ok) throw new Error(`GitHub API ${path}: HTTP ${res.status}`);
    return res.json();
  };
}

/** Whether a GET of `url` answers 2xx. */
export function existsClient(fetchImpl = fetch) {
  return async (url) => {
    const res = await fetchImpl(url, { headers: { "user-agent": USER_AGENT } });
    return res.ok;
  };
}

function parseVersion(argv, root) {
  const at = argv.indexOf("--version");
  if (at !== -1) return argv[at + 1];
  return JSON.parse(readFileSync(`${root}package.json`, "utf8")).version;
}

/** Check the suite and print one line per member; returns the exit code. */
export async function main(
  argv,
  { root = ROOT, env = process.env, fetchImpl = fetch, log = console.log } = {},
) {
  const version = parseVersion(argv, root);
  const ecosystem = JSON.parse(
    readFileSync(`${root}docs/ecosystem.json`, "utf8"),
  );
  const deps = {
    github: githubClient(env.GITHUB_TOKEN, fetchImpl),
    exists: existsClient(fetchImpl),
  };
  const results = await checkEcosystem(ecosystem, version, deps);
  for (const { name, problems } of results) {
    const status = problems.length === 0 ? "ok" : problems.join("; ");
    log(`${name}: ${status}`);
  }
  const failed = results.filter((r) => r.problems.length > 0).length;
  log(
    `ecosystem ${version}: ${results.length - failed}/${results.length} consistent`,
  );
  return failed === 0 ? 0 : 1;
}

await runIfMain(import.meta.url, main, {
  name: "check-ecosystem",
  failureCode: 2,
});
