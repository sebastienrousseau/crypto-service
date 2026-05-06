// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Algorithm registry: query metadata, recommendations, and deprecation status.
 *
 * Run: `npx ts-node examples/registry.ts`
 */

import { getAlgorithm, listAlgorithms, recommended, isDeprecated } from "../src";

function main() {
  console.log("\n=== crypto-lib — registry ===\n");

  // Look up a specific algorithm
  const algo = getAlgorithm("ml-kem-768");
  if (algo) {
    console.log(`Algorithm:      ${algo.name}`);
    console.log(`Category:       ${algo.category}`);
    console.log(`Security level: NIST Level ${algo.securityLevel}`);
    console.log(`Status:         ${algo.status}`);
    console.log(`Standard:       ${algo.standard ?? "N/A"}`);
  }

  // Look up by alias
  const schnorr = getAlgorithm("bip340");
  console.log(`\nAlias "bip340" resolves to: ${schnorr?.name}`);

  // Check deprecation
  console.log(`\npbkdf2-sha256 deprecated: ${isDeprecated("pbkdf2-sha256")}`);
  console.log(`argon2id deprecated:      ${isDeprecated("argon2id")}`);

  // List all recommended algorithms
  const recs = recommended();
  console.log(`\nRecommended algorithms: ${recs.length}`);
  for (const r of recs) {
    console.log(`  ${r.id.padEnd(25)} ${r.category.padEnd(15)} Level ${r.securityLevel}`);
  }

  // List all KEM algorithms
  const kems = listAlgorithms({ category: "kem" });
  console.log(`\nKEM algorithms: ${kems.length}`);
  for (const k of kems) {
    console.log(`  ${k.id.padEnd(25)} ${k.status}`);
  }

  // List all signing algorithms
  const signers = listAlgorithms({ category: "signing" });
  console.log(`\nSigning algorithms: ${signers.length}`);

  console.log("\nDone.");
}

main();
