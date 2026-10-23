#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Copies the Wycheproof test vectors crypto-lib runs from C2SP/wycheproof
// at one pinned commit into crypto-lib's fixtures, formatted with the
// repository's Prettier settings so a rerun reproduces them exactly.
//
//   node scripts/wycheproof-vectors.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

/** C2SP/wycheproof commit (2026-10-12). */
const COMMIT = "7a325932231bd7a724c791c8b0d65ea4d6d2f435";
const BASE = `https://raw.githubusercontent.com/C2SP/wycheproof/${COMMIT}/testvectors_v1`;
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages/crypto-lib/__tests__/fixtures/vectors/wycheproof",
);

const FILES = [
  "xchacha20_poly1305_test",
  "aes_gcm_test",
  "aes_gcm_siv_test",
  "x25519_test",
  "ed25519_test",
  "ed448_test",
  "ecdsa_secp256r1_sha256_p1363_test",
  "ecdsa_secp384r1_sha384_p1363_test",
];

mkdirSync(OUT, { recursive: true });
for (const name of FILES) {
  const res = await fetch(`${BASE}/${name}.json`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const vectors = await res.json();
  const file = join(OUT, `${name}.json`);
  const fixture = {
    source: `https://github.com/C2SP/wycheproof/blob/${COMMIT}/testvectors_v1/${name}.json`,
    commit: COMMIT,
    generatedBy: "scripts/wycheproof-vectors.mjs",
    ...vectors,
  };
  const json = await prettier.format(JSON.stringify(fixture), {
    ...(await prettier.resolveConfig(file)),
    filepath: file,
  });
  writeFileSync(file, json);
  console.log(`wycheproof-vectors: ${name}: ${vectors.numberOfTests} tests`);
}
