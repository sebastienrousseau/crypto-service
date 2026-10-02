#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Post-publish audit: every public package must exist on npm at the
// given version with a provenance attestation. Retries while the
// registry catches up. Usage: check-provenance.mjs <version>

import { readFileSync, readdirSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const version = process.argv[2];
if (!version) {
  console.error("usage: check-provenance.mjs <version>");
  process.exit(2);
}

const names = readdirSync(`${ROOT}packages`)
  .filter((d) => d.startsWith("crypto-"))
  .map((d) =>
    JSON.parse(readFileSync(`${ROOT}packages/${d}/package.json`, "utf8")),
  )
  .filter((pkg) => !pkg.private)
  .map((pkg) => pkg.name);

async function problem(name) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
  if (!res.ok) return `${name}: registry returned ${res.status}`;
  const meta = (await res.json()).versions?.[version];
  if (!meta) return `${name}@${version}: not on npm`;
  const att = meta.dist?.attestations;
  if (!att?.provenance) return `${name}@${version}: no provenance attestation`;
  return undefined;
}

let problems = [];
for (let attempt = 1; attempt <= 10; attempt++) {
  problems = (await Promise.all(names.map(problem))).filter(Boolean);
  if (problems.length === 0) break;
  await new Promise((r) => setTimeout(r, 15_000));
}

if (problems.length > 0) {
  console.error("provenance: audit failed");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`provenance: ok (${names.length} packages at ${version})`);
