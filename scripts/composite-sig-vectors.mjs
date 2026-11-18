#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Extracts the ML-DSA + Ed25519 test vectors from Appendix E of
// draft-ietf-lamps-pq-composite-sigs-19 into crypto-lib's fixtures,
// formatted with the repository's Prettier settings so a rerun reproduces
// them exactly. The draft's text is checked against a pinned SHA-256
// first; its GitHub copy lives on a branch that moves.
//
//   node scripts/composite-sig-vectors.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import { runIfMain } from "./lib/cli.mjs";
import { fetchDraft } from "./lib/ietf-draft.mjs";

const SOURCE =
  "https://www.ietf.org/archive/id/draft-ietf-lamps-pq-composite-sigs-19.txt";
/** SHA-256 of the draft's text, fetched 2026-10-22. */
const SHA256 =
  "b4ee04416efc26e7d8de7c740dc3848ffe8b8cc9dcd035ad9d4e33e18844ec83";
const FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages/crypto-lib/__tests__/fixtures/vectors/composite-sigs/mldsa-ed25519-draft-19.json",
);
/** The test cases crypto-lib implements. */
const WANTED = ["id-MLDSA44-Ed25519-SHA512", "id-MLDSA65-Ed25519-SHA512"];

/**
 * Appendix E holds one JSON document, word-wrapped at 72 columns with
 * page headers and footers in between. Its strings are base64 or names
 * with no spaces, so dropping the page lines and every line break
 * restores it.
 */
export function parseAppendix(text) {
  const lines = text.split("\n");
  // The last "Appendix E." line is the heading; the first is in the contents.
  const heading = lines.findLastIndex((l) => /^Appendix E\./.test(l));
  const start = lines.indexOf("   {", heading);
  const end = lines.findIndex((l, i) => i > start && /^Appendix F\./.test(l));
  const json = lines
    .slice(start, end)
    .filter(
      (l) =>
        !/^(Ounsworth, et al\.|Internet-Draft)/.test(l) && !l.includes("\f"),
    )
    .map((l) => l.trim())
    .join("");
  return JSON.parse(json);
}

/** The fixture: the wanted test cases of `appendix`, with its m and ctx. */
export function fixtureOf(appendix) {
  const tests = appendix.tests
    .filter((t) => WANTED.includes(t.tcId))
    .map(({ tcId, pk, sk, s, sWithContext }) => ({
      tcId,
      pk,
      sk,
      s,
      sWithContext,
    }));
  if (tests.length !== WANTED.length) {
    throw new Error(
      `expected ${WANTED.length} test cases, found ${tests.length}`,
    );
  }
  return {
    source: SOURCE,
    sha256: SHA256,
    section: "Appendix E",
    generatedBy: "scripts/composite-sig-vectors.mjs",
    encoding: "base64",
    m: appendix.m,
    ctx: appendix.ctx,
    tests,
  };
}

/** Fetch the draft and write the fixture to `file`; resolves to 0. */
export async function main(
  _argv,
  { file = FILE, sha256 = SHA256, fetchImpl = fetch, log = console.log } = {},
) {
  const text = await fetchDraft(SOURCE, sha256, fetchImpl);
  const fixture = fixtureOf(parseAppendix(text));
  mkdirSync(dirname(file), { recursive: true });
  const out = await prettier.format(JSON.stringify(fixture), {
    ...(await prettier.resolveConfig(file)),
    filepath: file,
  });
  writeFileSync(file, out);
  log(`composite-sig-vectors: ${fixture.tests.map((t) => t.tcId).join(", ")}`);
  return 0;
}

await runIfMain(import.meta.url, main, { name: "composite-sig-vectors" });
