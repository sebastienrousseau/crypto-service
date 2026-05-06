// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file useHash composable demo.
 *
 * Demonstrates reactive cryptographic hashing with multiple algorithms.
 *
 *   <script setup lang="ts">
 *   import { useHash } from "@sebastienrousseau/crypto-vue";
 *
 *   const { hash, digest, algorithm, isHashing } = useHash();
 *   </script>
 *
 *   <template>
 *     <button @click="hash('sha3-256', 'hello')">Hash with SHA3-256</button>
 *     <p v-if="digest">{{ algorithm }}: {{ digest }}</p>
 *   </template>
 */

import { useHash } from "../src";

async function demo() {
  const { hash, digest, algorithm, isHashing, error } = useHash();

  console.log("isHashing:", isHashing.value); // false

  // Hash with SHA3-256
  const h1 = await hash("sha3-256", "hello world");
  console.log("SHA3-256:", h1);
  console.log("Reactive digest:", digest.value);
  console.log("Algorithm:", algorithm.value);

  // Hash with BLAKE3
  const h2 = await hash("blake3", "hello world");
  console.log("BLAKE3:", h2);

  // Hash with SHA-512
  const h3 = await hash("sha512", "hello world");
  console.log("SHA-512:", h3);

  console.log("Error:", error.value); // null
}

demo().catch(console.error);
