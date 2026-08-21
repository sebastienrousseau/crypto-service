<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-vue-logo.svg" alt="crypto-vue logo" width="128" />
</p>

<h1 align="center">crypto-vue</h1>

<p align="center">
  Vue 3 composables for client-side cryptography -- key generation,
  encryption, signing, and hashing with reactive state.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-vue"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-vue?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT%2FApache--2.0-blue?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
  <img src="https://img.shields.io/badge/vue-%3E%3D3.3-42b883?style=for-the-badge&logo=vue.js" alt="Vue >= 3.3" />
</p>

---

## Contents

**Getting started**

- [Install](#install) -- npm, pnpm, peer dependencies
- [Quick Start](#quick-start) -- generate a key pair in three lines

**Package reference**

- [Overview](#overview) -- what crypto-vue does and why
- [CryptoPlugin](#cryptoplugin) -- optional global configuration via provide/inject
- [Composables Reference](#composables-reference) -- every composable at a glance
- [Examples](#examples) -- runnable scripts in `examples/`

**Operational**

- [Security](#security) -- client-side key handling guidelines
- [Documentation](#documentation) -- API reference
- [Contributing](#contributing) -- how to get involved
- [License](#license)

---

## Install

```bash
pnpm add @sebastienrousseau/crypto-vue @sebastienrousseau/crypto-lib
# or
npm install @sebastienrousseau/crypto-vue @sebastienrousseau/crypto-lib
```

`vue` (>= 3.3) is a **peer dependency**. The `crypto-lib` peer
dependency provides all underlying cryptographic primitives.

Requires **Node >= 22**.

<p align="right"><a href="#contents">Back to Top</a></p>

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

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-vue provides Vue 3 composables for client-side cryptographic
operations. It wraps `@sebastienrousseau/crypto-lib` in a reactive
API with composables for key generation, symmetric encryption,
hashing, and digital signatures. An optional `CryptoPlugin` supplies
global configuration (default key, server URL, API key) via Vue's
provide/inject system.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## CryptoPlugin

An optional Vue plugin that provides global configuration to all
composables via `inject`/`provide`.

```ts
// main.ts
import { createApp } from "vue";
import { CryptoPlugin } from "@sebastienrousseau/crypto-vue";
import App from "./App.vue";

const app = createApp(App);

app.use(CryptoPlugin, {
  defaultKey: "your-256-bit-hex-key",
  serverUrl: "https://api.example.com",
  apiKey: "your-api-key",
});

app.mount("#app");
```

| Option       | Type     | Description                                 |
| :----------- | :------- | :------------------------------------------ |
| `defaultKey` | `string` | Default encryption key (256-bit hex string) |
| `serverUrl`  | `string` | Base URL for the Crypto Service REST API    |
| `apiKey`     | `string` | API key for authenticated server requests   |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Composables Reference

### `useKeypair()`

Reactive key pair generation for any supported algorithm.

**Supported algorithms:** `ed25519`, `x25519`, `ed448`, `x448`,
`p256`, `p384`, `ml-kem-512`, `ml-kem-768`, `ml-kem-1024`,
`ml-dsa-44`, `ml-dsa-65`, `ml-dsa-87`

---

### `useEncrypt()`

Symmetric encryption and decryption using XChaCha20-Poly1305
(secretbox).

---

### `useHash()`

Cryptographic hashing with multiple algorithms.

**Supported algorithms:** `sha256`, `sha384`, `sha512`, `sha3-256`,
`sha3-512`, `blake2b`, `blake3`

---

### `useSignature()`

Digital signature creation and verification.

**Supported algorithms:** `ed25519`, `ed448`, `ecdsa-p256`,
`ecdsa-p384`, `schnorr`, `ml-dsa-44`, `ml-dsa-65`, `ml-dsa-87`

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category       | Example                           | Purpose                                       |
| :------------- | :-------------------------------- | :-------------------------------------------- |
| Plugin         | [plugin.ts](examples/plugin.ts)   | CryptoPlugin setup and injection              |
| Key Generation | [keygen.ts](examples/keygen.ts)   | Generate Ed25519 and ML-DSA-65 key pairs      |
| Encryption     | [encrypt.ts](examples/encrypt.ts) | Secretbox encrypt and decrypt round-trip      |
| Hashing        | [hash.ts](examples/hash.ts)       | SHA-256, SHA3-256, and BLAKE3 hashing         |
| Signing        | [sign.ts](examples/sign.ts)       | Ed25519 sign and verify with tamper detection |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

**Client-side key handling warnings:**

- Private keys held in Vue reactive state live in browser memory and
  are vulnerable to XSS, browser extensions, and memory inspection.
  Never persist private keys in `localStorage` or cookies.
- Prefer server-side key management for production workloads. Use
  the companion `@sebastienrousseau/crypto-sdk` to delegate
  operations to a trusted backend.
- These composables are best suited for ephemeral operations where
  the key material is short-lived.
- Call `clear()` when keys are no longer needed to remove sensitive
  material from reactive state.
- Use `Content-Security-Policy` headers to limit script injection
  risks.

**Audited primitives.** All crypto operations delegate to
`@sebastienrousseau/crypto-lib`, which uses the audited `@noble/*`
suite internally.

**Responsible disclosure.** Report vulnerabilities via
[GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Documentation

API reference documentation is generated with TypeDoc. Build it
locally with:

```bash
pnpm --filter @sebastienrousseau/crypto-vue docs
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup,
coding standards, and pull request guidelines.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)
or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service
Suite contributors.

<p align="right"><a href="#contents">Back to Top</a></p>
