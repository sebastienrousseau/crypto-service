#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Regenerates crypto-lib's NIST ACVP known-answer fixtures for ML-KEM
// (FIPS 203), ML-DSA (FIPS 204) and SLH-DSA (FIPS 205) from the
// usnistgov/ACVP-Server repository at one pinned commit.
//
// The full vector files are large (SLH-DSA signing alone is 38 MB), so
// each fixture keeps the first few test cases of every group crypto-lib
// can run: the pure "external" signature interface, deterministic
// signing, and every ML-KEM function. Run it to refresh the fixtures
// after moving COMMIT; the output is deterministic.
//
//   node scripts/acvp-vectors.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** usnistgov/ACVP-Server commit (RELEASE/v1.1.0.43, 2026-08-12). */
const COMMIT = "975de31eb83d87039ec88934fdc47d8c312b892d";
const BASE = `https://raw.githubusercontent.com/usnistgov/ACVP-Server/${COMMIT}/gen-val/json-files`;
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages/crypto-lib/__tests__/fixtures/vectors/acvp",
);

/** Each fixture: its ACVP vector set, which groups to keep, how many cases. */
const SETS = [
  { name: "ML-KEM-keyGen-FIPS203", keep: () => true, cases: 3 },
  { name: "ML-KEM-encapDecap-FIPS203", keep: () => true, cases: 3 },
  { name: "ML-DSA-keyGen-FIPS204", keep: () => true, cases: 3 },
  {
    name: "ML-DSA-sigGen-FIPS204",
    keep: (g) =>
      g.deterministic === true &&
      g.signatureInterface === "external" &&
      g.preHash === "pure",
    cases: 3,
  },
  {
    name: "ML-DSA-sigVer-FIPS204",
    keep: (g) => g.signatureInterface === "external" && g.preHash === "pure",
    cases: 5,
    drop: ["sk"],
  },
  { name: "SLH-DSA-keyGen-FIPS205", keep: () => true, cases: 2 },
  {
    name: "SLH-DSA-sigGen-FIPS205",
    keep: (g) =>
      g.deterministic === true &&
      g.signatureInterface === "external" &&
      g.preHash === "pure" &&
      g.parameterSet.endsWith("f"),
    cases: 1,
  },
  {
    name: "SLH-DSA-sigVer-FIPS205",
    keep: (g) => g.signatureInterface === "external" && g.preHash === "pure",
    cases: 2,
    drop: ["sk", "additionalRandomness"],
  },
];

/**
 * Keeps the `n` smallest cases (signatures over long messages make the
 * files large), with at least one failing case if the group has any.
 */
function pick(tests, n) {
  const bySize = [...tests].sort(
    (a, b) => JSON.stringify(a).length - JSON.stringify(b).length,
  );
  const chosen = bySize.slice(0, n);
  const failing = bySize.find((t) => t.testPassed === false);
  if (failing && !chosen.some((t) => t.testPassed === false)) {
    chosen[chosen.length - 1] = failing;
  }
  return chosen;
}

mkdirSync(OUT, { recursive: true });
for (const set of SETS) {
  const res = await fetch(`${BASE}/${set.name}/internalProjection.json`);
  if (!res.ok) throw new Error(`${set.name}: HTTP ${res.status}`);
  const full = await res.json();
  const testGroups = full.testGroups.filter(set.keep).map((g) => ({
    ...g,
    tests: pick(g.tests, set.cases).map((t) =>
      Object.fromEntries(
        Object.entries(t).filter(([k]) => !(set.drop ?? []).includes(k)),
      ),
    ),
  }));
  const fixture = {
    source: `https://github.com/usnistgov/ACVP-Server/tree/${COMMIT}/gen-val/json-files/${set.name}`,
    commit: COMMIT,
    generatedBy: "scripts/acvp-vectors.mjs",
    algorithm: full.algorithm,
    mode: full.mode,
    revision: full.revision,
    testGroups,
  };
  const file = join(OUT, `${set.name}.json`);
  writeFileSync(file, `${JSON.stringify(fixture)}\n`);
  const cases = testGroups.reduce((n, g) => n + g.tests.length, 0);
  console.log(`acvp-vectors: ${set.name}: ${testGroups.length} groups, ${cases} cases`);
}
