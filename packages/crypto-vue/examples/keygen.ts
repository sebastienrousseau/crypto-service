// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file useKeypair composable demo.
 *
 * Demonstrates reactive key pair generation in a Vue 3 setup context.
 *
 * Run (conceptually — this file is meant to be used inside a Vue component):
 *
 *   <script setup lang="ts">
 *   import { useKeypair } from "@sebastienrousseau/crypto-vue";
 *
 *   const { publicKey, privateKey, algorithm, isGenerating, generate } = useKeypair();
 *   </script>
 *
 *   <template>
 *     <button @click="generate('ed25519')" :disabled="isGenerating">
 *       Generate Ed25519 Key Pair
 *     </button>
 *     <p v-if="publicKey">Public: {{ publicKey }}</p>
 *     <p v-if="privateKey">Private: {{ privateKey }}</p>
 *     <p v-if="algorithm">Algorithm: {{ algorithm }}</p>
 *   </template>
 */

import { useKeypair } from "../src";

async function demo() {
  const { publicKey, privateKey, algorithm, isGenerating, generate, error } =
    useKeypair();

  console.log("isGenerating:", isGenerating.value); // false

  // Generate an Ed25519 key pair
  const kp = await generate("ed25519");
  console.log("Algorithm:", algorithm.value); // "ed25519"
  console.log("Public key:", publicKey.value);
  console.log("Private key:", privateKey.value);
  console.log("Full result:", kp);

  // Generate a post-quantum key pair
  await generate("ml-dsa-65");
  console.log("PQ Algorithm:", algorithm.value); // "ml-dsa-65"
  console.log("PQ Public key length:", publicKey.value?.length);

  console.log("Error:", error.value); // null
}

demo().catch(console.error);
