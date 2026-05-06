<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->
<!-- Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved. -->

<div align="center">

![Crypto Vue logo](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-vue-logo.svg)

# Crypto Vue

Vue 3 composables for client-side cryptography -- key generation, encryption, signing, and hashing with reactive state.

[![Build](https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?style=for-the-badge&branch=main)](https://github.com/sebastienrousseau/crypto-service/actions)
[![npm](https://img.shields.io/npm/v/@sebastienrousseau/crypto-vue.svg?style=for-the-badge)](https://www.npmjs.com/package/@sebastienrousseau/crypto-vue)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D22-green.svg?style=for-the-badge)](https://nodejs.org/)
[![Vue](https://img.shields.io/badge/vue-%3E%3D3.3-brightgreen.svg?style=for-the-badge)](https://vuejs.org/)

**[Website](https://crypto-service.co)
&middot; [Documentation](https://crypto-service.co/docs/)
&middot; [Submit an Issue](https://github.com/sebastienrousseau/crypto-service/issues)
&middot; [Contributing Guidelines](https://github.com/sebastienrousseau/crypto-service/blob/main/.github/CONTRIBUTING.md)**

</div>

---

## Contents

- [Install](#install) &mdash; Add the package to your Vue 3 project
- [Quick Start](#quick-start) &mdash; Generate a key pair in three lines
- [CryptoPlugin](#cryptoplugin) &mdash; Optional global configuration
- [Composables Reference](#composables-reference) &mdash; Full API for every composable
- [Usage](#usage) &mdash; Real-world examples
- [Security](#security) &mdash; Important considerations
- [License](#license) &mdash; MIT

---

## Install

```bash
# npm
npm install @sebastienrousseau/crypto-vue @sebastienrousseau/crypto-lib

# yarn
yarn add @sebastienrousseau/crypto-vue @sebastienrousseau/crypto-lib

# pnpm
pnpm add @sebastienrousseau/crypto-vue @sebastienrousseau/crypto-lib
```

> **Requirements:** Vue >= 3.3, Node >= 22. The `crypto-lib` peer dependency provides all underlying cryptographic primitives.

---

## Quick Start

```vue
<script setup lang="ts">
import { useKeypair } from "@sebastienrousseau/crypto-vue";

const { publicKey, privateKey, generate, isGenerating } = useKeypair();
</script>

<template>
  <button @click="generate('ed25519')" :disabled="isGenerating">
    Generate Key Pair
  </button>
  <pre v-if="publicKey">{{ publicKey }}</pre>
</template>
```

---

## CryptoPlugin

An optional Vue plugin that provides global configuration to all composables via `inject`/`provide`.

```ts
// main.ts
import { createApp } from "vue";
import { CryptoPlugin } from "@sebastienrousseau/crypto-vue";
import App from "./App.vue";

const app = createApp(App);

app.use(CryptoPlugin, {
  defaultKey: "your-256-bit-hex-key", // used by useEncrypt when no key is passed
  serverUrl: "https://api.example.com", // for future server-side composables
  apiKey: "your-api-key", // for future authenticated requests
});

app.mount("#app");
```

### Options

| Option       | Type     | Description                                 |
| ------------ | -------- | ------------------------------------------- |
| `defaultKey` | `string` | Default encryption key (256-bit hex string) |
| `serverUrl`  | `string` | Base URL for the Crypto Service REST API    |
| `apiKey`     | `string` | API key for authenticated server requests   |

---

## Composables Reference

### `useKeypair()`

Reactive key pair generation for any supported algorithm.

```ts
const {
  publicKey, // Ref<string | null> — hex-encoded public key
  privateKey, // Ref<string | null> — hex-encoded private key
  algorithm, // Ref<KeyAlgorithm | null> — algorithm used
  isGenerating, // Ref<boolean>
  error, // Ref<Error | null>
  generate, // (algo: KeyAlgorithm) => Promise<GeneratedKeyPair>
  clear, // () => void
} = useKeypair();
```

**Supported algorithms:** `ed25519`, `x25519`, `ed448`, `x448`, `p256`, `p384`, `ml-kem-512`, `ml-kem-768`, `ml-kem-1024`, `ml-dsa-44`, `ml-dsa-65`, `ml-dsa-87`

---

### `useEncrypt()`

Symmetric encryption and decryption using XChaCha20-Poly1305 (secretbox).

```ts
const {
  ciphertext, // Ref<string | null> — hex-encoded ciphertext
  plaintext, // Ref<string | null> — decrypted text
  isProcessing, // Ref<boolean>
  error, // Ref<Error | null>
  encrypt, // (key: string, data: string | Uint8Array) => Promise<string>
  decrypt, // (key: string, data: string) => Promise<Uint8Array>
  randomKey, // () => string — generate a 256-bit key
  clear, // () => void
} = useEncrypt();
```

---

### `useHash()`

Cryptographic hashing with multiple algorithms.

```ts
const {
  digest, // Ref<string | null> — hex-encoded digest
  algorithm, // Ref<HashAlgorithm | null>
  isHashing, // Ref<boolean>
  error, // Ref<Error | null>
  hash, // (algo: HashAlgorithm, data: string | Uint8Array) => Promise<string>
  clear, // () => void
} = useHash();
```

**Supported algorithms:** `sha256`, `sha384`, `sha512`, `sha3-256`, `sha3-512`, `blake2b`, `blake3`

---

### `useSignature()`

Digital signature creation and verification.

```ts
const {
  signature, // Ref<string | null> — hex-encoded signature
  isValid, // Ref<boolean | null> — last verification result
  algorithm, // Ref<SignAlgorithm | null>
  isProcessing, // Ref<boolean>
  error, // Ref<Error | null>
  sign, // (algo, privateKeyHex, message) => Promise<string>
  verify, // (algo, publicKeyHex, message, signatureHex) => Promise<boolean>
  clear, // () => void
} = useSignature();
```

**Supported algorithms:** `ed25519`, `ed448`, `ecdsa-p256`, `ecdsa-p384`, `schnorr`, `ml-dsa-44`, `ml-dsa-65`, `ml-dsa-87`

---

## Usage

### Encrypt and Decrypt

```vue
<script setup lang="ts">
import { useEncrypt } from "@sebastienrousseau/crypto-vue";

const { encrypt, decrypt, randomKey, ciphertext, plaintext } = useEncrypt();
const key = randomKey();

async function roundTrip() {
  await encrypt(key, "secret message");
  await decrypt(key, ciphertext.value!);
  console.log(plaintext.value); // "secret message"
}
</script>
```

### Sign and Verify

```vue
<script setup lang="ts">
import { useKeypair, useSignature } from "@sebastienrousseau/crypto-vue";

const { publicKey, privateKey, generate } = useKeypair();
const { sign, verify, signature, isValid } = useSignature();

async function signAndVerify() {
  await generate("ed25519");
  await sign("ed25519", privateKey.value!, "hello");
  await verify("ed25519", publicKey.value!, "hello", signature.value!);
  console.log(isValid.value); // true
}
</script>
```

### Hash Data

```vue
<script setup lang="ts">
import { useHash } from "@sebastienrousseau/crypto-vue";

const { hash, digest } = useHash();

async function hashData() {
  await hash("sha3-256", "hello world");
  console.log(digest.value);
}
</script>
```

### Post-Quantum Key Generation

```vue
<script setup lang="ts">
import { useKeypair } from "@sebastienrousseau/crypto-vue";

const { publicKey, generate, algorithm } = useKeypair();

async function generatePQ() {
  await generate("ml-dsa-65");
  console.log(algorithm.value); // "ml-dsa-65"
}
</script>
```

---

## Security

- **Client-side only.** All cryptographic operations run in the browser or Node.js process. Private keys never leave the client unless you explicitly transmit them.
- **Key management.** The reactive `privateKey` ref holds sensitive material in memory. Call `clear()` when keys are no longer needed.
- **No persistence.** Composable state is ephemeral. Keys and ciphertexts are not stored in localStorage or cookies.
- **Audited primitives.** All crypto operations delegate to `@sebastienrousseau/crypto-lib`, which uses the audited `@noble/*` suite internally.

---

## License

MIT -- see [LICENSE](../../LICENSE) for details.
