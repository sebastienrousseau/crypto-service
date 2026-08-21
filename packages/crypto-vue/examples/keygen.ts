// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Generate Ed25519 and ML-DSA-65 key pairs via the useKeypair composable.
 *
 * Demonstrates calling the composable's generate() function with different
 * algorithms and inspecting the returned key material.
 *
 * Run: `npx ts-node examples/keygen.ts`
 */

import { header, task, summary } from "./support";
import { useKeypair } from "../src";

async function main() {
  header("crypto-vue -- keygen");

  const { publicKey, privateKey, algorithm, isGenerating, generate, error } =
    useKeypair();

  await task("Generate Ed25519 key pair", async () => {
    await generate("ed25519");
  });

  await task("Verify Ed25519 key material is present", () => {
    if (!publicKey.value) throw new Error("Missing public key");
    if (!privateKey.value) throw new Error("Missing private key");
    if (algorithm.value !== "ed25519") {
      throw new Error(`Expected ed25519, got ${algorithm.value}`);
    }
  });

  await task("Generate ML-DSA-65 key pair", async () => {
    await generate("ml-dsa-65");
  });

  await task("Verify ML-DSA-65 key material is present", () => {
    if (!publicKey.value) throw new Error("Missing public key");
    if (algorithm.value !== "ml-dsa-65") {
      throw new Error(`Expected ml-dsa-65, got ${algorithm.value}`);
    }
  });

  await task("Confirm isGenerating is false after completion", () => {
    if (isGenerating.value) throw new Error("Expected isGenerating to be false");
  });

  await task("Confirm no errors occurred", () => {
    if (error.value) throw new Error(`Unexpected error: ${error.value.message}`);
  });

  summary(6);
}

main();
