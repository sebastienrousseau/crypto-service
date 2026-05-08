// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Algorithm registry: query metadata, recommendations, and deprecation status.
 *
 * Run: `npx ts-node examples/registry.ts`
 */

import { header, task, taskWithOutput, summary } from "./support";
import { getAlgorithm, listAlgorithms, recommended, isDeprecated } from "../src";

async function main() {
  header("crypto-lib -- registry");

  await taskWithOutput("Look up ML-KEM-768 metadata", () => {
    const algo = getAlgorithm("ml-kem-768");
    return [
      `name: ${algo?.name}`,
      `category: ${algo?.category}`,
      `level: NIST Level ${algo?.securityLevel}`,
      `status: ${algo?.status}`,
    ];
  });

  await task("Resolve alias 'bip340' to Schnorr", () => {
    const algo = getAlgorithm("bip340");
    if (!algo) throw new Error("Alias not found");
  });

  await task("Check deprecation status", () => {
    if (!isDeprecated("pbkdf2-sha256")) throw new Error("Should be deprecated");
    if (isDeprecated("argon2id")) throw new Error("Should not be deprecated");
  });

  await taskWithOutput("List recommended algorithms", () => {
    const recs = recommended();
    return recs.map((r) => `${r.id.padEnd(25)} ${r.category.padEnd(15)} Level ${r.securityLevel}`);
  });

  await taskWithOutput("List KEM algorithms", () => {
    const kems = listAlgorithms({ category: "kem" });
    return kems.map((k) => `${k.id.padEnd(25)} ${k.status}`);
  });

  summary(5);
}

main();
