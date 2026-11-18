#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Extracts the X-Wing test vectors from Appendix C of
// draft-connolly-cfrg-xwing-kem-06, the revision IANA's HPKE registry
// cites for KEM 0x647A, into crypto-lib's fixtures, formatted with the
// repository's Prettier settings so a rerun reproduces them exactly. The
// draft's text is checked against a pinned SHA-256 first.
//
//   node scripts/xwing-vectors.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import { runIfMain } from "./lib/cli.mjs";
import { fetchDraft } from "./lib/ietf-draft.mjs";

const SOURCE =
  "https://www.ietf.org/archive/id/draft-connolly-cfrg-xwing-kem-06.txt";
/** SHA-256 of the draft's text, fetched 2026-10-22. */
const SHA256 =
  "318cae42b369fbe544d9dc1527bce5b00769ee1593db40b8d3abf72ea4537530";
const FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages/crypto-lib/__tests__/fixtures/vectors/xwing/xwing-draft-06.json",
);
/** Byte length of each field of a vector. */
const LENGTHS = { seed: 32, sk: 32, pk: 1216, eseed: 64, ct: 1120, ss: 32 };

/**
 * Appendix C lists each vector as `name value` lines, with long values
 * continued on indented lines and page headers and footers in between.
 */
export function parseVectors(text) {
  const lines = text.split("\n");
  const start = lines.findLastIndex((l) => l.startsWith("Appendix C."));
  const vectors = [];
  let field;
  for (const line of lines.slice(start + 1)) {
    const named = /^([a-z]+)(?:\s+([0-9a-f]*))?\s*$/.exec(line);
    const continued = /^\s+([0-9a-f]+)\s*$/.exec(line);
    if (named && named[1] in LENGTHS) {
      field = named[1];
      if (field === "seed") vectors.push({});
      vectors.at(-1)[field] = named[2] ?? "";
    } else if (continued && field) {
      vectors.at(-1)[field] += continued[1];
    } else if (/^\S/.test(line) && !/^(Connolly|Internet-Draft)/.test(line)) {
      field = undefined;
    }
  }
  vectors.forEach(checkLengths);
  return vectors;
}

/** Throws unless every field of `vector` has its byte length. */
export function checkLengths(vector) {
  for (const [name, length] of Object.entries(LENGTHS)) {
    if (vector[name]?.length !== 2 * length) {
      throw new Error(`vector field ${name}: expected ${length} bytes`);
    }
  }
}

/** Fetch the draft and write the fixture to `file`; resolves to 0. */
export async function main(
  _argv,
  { file = FILE, sha256 = SHA256, fetchImpl = fetch, log = console.log } = {},
) {
  const vectors = parseVectors(await fetchDraft(SOURCE, sha256, fetchImpl));
  mkdirSync(dirname(file), { recursive: true });
  const fixture = {
    source: SOURCE,
    sha256: SHA256,
    section: "Appendix C",
    generatedBy: "scripts/xwing-vectors.mjs",
    vectors,
  };
  const json = await prettier.format(JSON.stringify(fixture), {
    ...(await prettier.resolveConfig(file)),
    filepath: file,
  });
  writeFileSync(file, json);
  log(`xwing-vectors: ${vectors.length} vectors`);
  return 0;
}

await runIfMain(import.meta.url, main, { name: "xwing-vectors" });
