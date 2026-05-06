// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file useSignature composable demo.
 *
 * Demonstrates reactive digital signature creation and verification.
 *
 *   <script setup lang="ts">
 *   import { useKeypair, useSignature } from "@sebastienrousseau/crypto-vue";
 *
 *   const { publicKey, privateKey, generate } = useKeypair();
 *   const { sign, verify, signature, isValid } = useSignature();
 *   </script>
 *
 *   <template>
 *     <button @click="generate('ed25519')">Generate Keys</button>
 *     <button @click="sign('ed25519', privateKey!, 'msg')" :disabled="!privateKey">Sign</button>
 *     <button @click="verify('ed25519', publicKey!, 'msg', signature!)" :disabled="!signature">Verify</button>
 *     <p v-if="isValid !== null">Valid: {{ isValid }}</p>
 *   </template>
 */

import { useKeypair, useSignature } from "../src";

async function demo() {
  const { publicKey, privateKey, generate } = useKeypair();
  const { sign, verify, signature, isValid, algorithm, error } = useSignature();

  // Generate Ed25519 keys
  await generate("ed25519");
  console.log("Public key:", publicKey.value);

  // Sign a message
  const message = "Hello, digital signatures!";
  const sig = await sign("ed25519", privateKey.value!, message);
  console.log("Signature:", sig);
  console.log("Algorithm:", algorithm.value);

  // Verify the signature
  const valid = await verify("ed25519", publicKey.value!, message, sig);
  console.log("Valid:", valid); // true
  console.log("Reactive isValid:", isValid.value); // true

  // Verify with wrong message
  await verify("ed25519", publicKey.value!, "wrong message", sig);
  console.log("Wrong message valid:", isValid.value); // false

  console.log("Error:", error.value); // null
}

demo().catch(console.error);
