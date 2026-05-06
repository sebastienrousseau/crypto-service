// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file useEncrypt composable demo.
 *
 * Demonstrates reactive symmetric encryption/decryption using
 * XChaCha20-Poly1305 (secretbox).
 *
 *   <script setup lang="ts">
 *   import { useEncrypt } from "@sebastienrousseau/crypto-vue";
 *
 *   const { encrypt, decrypt, randomKey, ciphertext, plaintext } = useEncrypt();
 *   const key = randomKey();
 *   </script>
 *
 *   <template>
 *     <button @click="encrypt(key, 'hello world')">Encrypt</button>
 *     <p v-if="ciphertext">Ciphertext: {{ ciphertext }}</p>
 *     <button @click="decrypt(key, ciphertext!)" :disabled="!ciphertext">Decrypt</button>
 *     <p v-if="plaintext">Plaintext: {{ plaintext }}</p>
 *   </template>
 */

import { useEncrypt } from "../src";

async function demo() {
  const { encrypt, decrypt, randomKey, ciphertext, plaintext, error } =
    useEncrypt();

  // Generate a random 256-bit key
  const key = randomKey();
  console.log("Key:", key);

  // Encrypt a message
  const ct = await encrypt(key, "Hello, crypto-vue!");
  console.log("Ciphertext:", ct);
  console.log("Reactive ciphertext:", ciphertext.value);

  // Decrypt
  const pt = await decrypt(key, ct);
  console.log("Decrypted bytes:", pt);
  console.log("Reactive plaintext:", plaintext.value);

  console.log("Error:", error.value); // null
}

demo().catch(console.error);
