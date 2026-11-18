#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Post-publish audit: every public package must exist on npm at the
// given version with a provenance attestation. Retries while the
// registry catches up. Usage: check-provenance.mjs <version>

import { readFileSync, readdirSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { runIfMain } from "./lib/cli.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MAX_ATTEMPTS = 24;
const RETRY_MS = 15_000;

/** npm names of the public packages under `root`. */
export function publicNames(root) {
  return readdirSync(`${root}packages`)
    .filter((d) => d.startsWith("crypto-"))
    .map((d) =>
      JSON.parse(readFileSync(`${root}packages/${d}/package.json`, "utf8")),
    )
    .filter((pkg) => !pkg.private)
    .map((pkg) => pkg.name);
}

/** What is wrong with `name@version` on npm, or undefined when nothing. */
export async function problem(name, version, fetchImpl = fetch) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`;
  const res = await fetchImpl(url, {
    headers: { "cache-control": "no-cache" },
  });
  if (!res.ok) return `${name}: registry returned ${res.status}`;
  const meta = (await res.json()).versions?.[version];
  if (!meta) return `${name}@${version}: not on npm`;
  const att = meta.dist?.attestations;
  if (!att?.provenance) return `${name}@${version}: no provenance attestation`;
  return undefined;
}

const DEFAULTS = {
  root: ROOT,
  fetchImpl: fetch,
  retryMs: RETRY_MS,
  log: console.log,
  error: console.error,
};

/** Audit every public package at `argv[0]`; resolves to the exit code. */
export async function main(argv, options = {}) {
  const { root, fetchImpl, retryMs, log, error } = { ...DEFAULTS, ...options };
  const version = argv[0];
  if (!version) {
    error("usage: check-provenance.mjs <version>");
    return 2;
  }
  const names = publicNames(root);
  let problems = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    problems = (
      await Promise.all(names.map((n) => problem(n, version, fetchImpl)))
    ).filter(Boolean);
    if (problems.length === 0) break;
    if (attempt < MAX_ATTEMPTS) {
      log(
        `provenance: attempt ${attempt}/${MAX_ATTEMPTS} - ${problems.length} package(s) propagating on npm, retrying in 15s...`,
      );
      await delay(retryMs);
    }
  }
  if (problems.length > 0) {
    error("provenance: audit failed");
    for (const p of problems) error(`  ${p}`);
    return 1;
  }
  log(`provenance: ok (${names.length} packages at ${version})`);
  return 0;
}

await runIfMain(import.meta.url, main, { name: "check-provenance" });
