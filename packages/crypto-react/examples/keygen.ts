// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Generate Ed25519 and ML-DSA-65 key pairs via the useKeypair hook.
 *
 * Demonstrates calling the hook's generate() function with different
 * algorithms and inspecting the returned key material.
 *
 * Run: `npx ts-node examples/keygen.ts`
 */

import { header, task, summary } from "./support";
import { useKeypair } from "../src";

async function main() {
  header("crypto-react -- keygen");

  const { publicKey, privateKey, algorithm, generate, isGenerating } =
    useKeypair("ed25519");

  await task("Generate Ed25519 key pair", () => {
    generate();
  });

  await task("Verify Ed25519 key material is present", () => {
    if (!publicKey) throw new Error("Missing public key");
    if (!privateKey) throw new Error("Missing private key");
    if (algorithm !== "ed25519") {
      throw new Error(`Expected ed25519, got ${algorithm}`);
    }
  });

  await task("Generate ML-DSA-65 key pair", () => {
    generate("ml-dsa-65");
  });

  await task("Verify ML-DSA-65 key material is present", () => {
    if (!publicKey) throw new Error("Missing public key");
    if (algorithm !== "ml-dsa-65") {
      throw new Error(`Expected ml-dsa-65, got ${algorithm}`);
    }
  });

  await task("Confirm isGenerating flag is false after completion", () => {
    if (isGenerating) throw new Error("Expected isGenerating to be false");
  });

  summary(5);
}

main();
