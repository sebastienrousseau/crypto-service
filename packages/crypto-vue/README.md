<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-vue-logo.svg" alt="crypto-vue logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-vue</h1>

<p align="center">
  Vue 3 composables for client-side cryptography — key generation, encryption, signing, and hashing with reactive state.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-vue"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-vue.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
  <a href="https://sebastienrousseau.github.io/crypto-service/"><img src="https://img.shields.io/badge/docs-TypeDoc-blue.svg?style=for-the-badge&labelColor=555555&logo=typescript" alt="Docs" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/sebastienrousseau/crypto-service" title="ossf-scorecard"><img src="https://img.shields.io/badge/OpenSSF-Scorecard-blue?style=for-the-badge&logo=openssf" alt="OpenSSF Scorecard" /></a>
  <a href="https://github.com/sebastienrousseau/crypto-service/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg?style=for-the-badge" alt="License: Apache-2.0 OR MIT" /></a>
  <a href="https://github.com/sebastienrousseau/crypto-service/blob/main/docs/POLICIES.md"><img src="https://img.shields.io/badge/Node.js-%3E%3D22-93450a.svg?style=for-the-badge&logo=node.js" alt="Node.js 22 or newer" /></a>
  <a href="https://vuejs.org/"><img src="https://img.shields.io/badge/vue-%3E%3D3.3-42b883.svg?style=for-the-badge&logo=vue.js" alt="Vue >= 3.3" /></a>
</p>

---

## Contents

**Getting started**

- [Install](#install) — installation via pnpm, npm, or yarn
- [Requirements](#requirements) — runtime floor and environment prerequisites
- [Quick Start](#quick-start) — minimal working usage sample

**The Crypto Service ecosystem**

- [The Crypto Service ecosystem](#the-crypto-service-ecosystem) — full 14-package suite overview

**Package reference**

- [Reference & Usage](#overview) — features, configuration, and capabilities
- [Examples](#examples) — runnable sample code

**Operational**

- [Development](#development) — build, lint, format, and test targets
- [Security](#security) — vulnerability disclosure and cryptographic invariants
- [Documentation](#documentation) — TypeDoc API docs and ecosystem guides
- [Stability guarantees](#stability-guarantees) — SemVer axis and release policy
- [License](#license)

---

## Install

```bash
pnpm add @sebastienrousseau/crypto-vue
# or
npm install @sebastienrousseau/crypto-vue
# or
yarn add @sebastienrousseau/crypto-vue
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Requirements

- **Node.js**: `^22.0.0` or `>=24.0.0` (active and maintenance LTS releases)
- **Package Manager**: `pnpm >=9` (recommended) or `npm >=10`
- **TypeScript**: `>=5.0` (when compiling with TypeScript)

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

## The Crypto Service ecosystem

Crypto Service provides a complete cryptography stack across 14 specialized packages:

| Package                                                               | Role                | Description                                                                                                                            |
| :-------------------------------------------------------------------- | :------------------ | :------------------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](../crypto-api)                      | API Schemas         | Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.                                |
| [`@sebastienrousseau/crypto-cli`](../crypto-cli)                      | Terminal CLI        | An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms. |
| [`@sebastienrousseau/crypto-edge`](../crypto-edge)                    | Edge Runtime        | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.               |
| [`@sebastienrousseau/crypto-kms`](../crypto-kms)                      | Cloud KMS           | Unified Key Management Service interface for AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.                             |
| [`@sebastienrousseau/crypto-lib`](../crypto-lib)                      | Core Library        | A modern cryptographic library for TypeScript, with post-quantum support, zero unsafe dependencies, and 100% test coverage.            |
| [`@sebastienrousseau/crypto-middleware`](../crypto-middleware)        | Middleware          | Framework-agnostic cryptographic middleware for Express, Fastify, and Koa applications.                                                |
| [`@sebastienrousseau/crypto-prisma`](../crypto-prisma)                | ORM Adapter         | Transparent field-level encryption extension for Prisma Client, using XChaCha20-Poly1305.                                              |
| [`@sebastienrousseau/crypto-react`](../crypto-react)                  | React Hooks         | React hooks and context provider for client-side cryptographic operations with zero boilerplate.                                       |
| [`@sebastienrousseau/crypto-sdk`](../crypto-sdk)                      | Client SDK          | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                                  |
| [`@sebastienrousseau/crypto-server`](../crypto-server)                | HTTP API            | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.             |
| [`@sebastienrousseau/crypto-testing`](../crypto-testing)              | Test Support        | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                                       |
| [`@sebastienrousseau/crypto-typeorm`](../crypto-typeorm)              | ORM Adapter         | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                        |
| **[`@sebastienrousseau/crypto-vue`](../crypto-vue)** _(this package)_ | **Vue Composables** | **Vue 3 composables for client-side cryptography**                                                                                     |
| [`@sebastienrousseau/crypto-wasm`](../crypto-wasm)                    | Acceleration        | WebAssembly performance accelerator for crypto-lib                                                                                     |

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

## Composables Reference

### `useKeypair()`

Reactive key pair generation for any supported algorithm.

**Supported algorithms:** `ed25519`, `x25519`, `ed448`, `x448`,
`p256`, `p384`, `ml-kem-512`, `ml-kem-768`, `ml-kem-1024`,
`ml-dsa-44`, `ml-dsa-65`, `ml-dsa-87`

### `useEncrypt()`

Symmetric encryption and decryption using XChaCha20-Poly1305
(secretbox).

### `useHash()`

Cryptographic hashing with multiple algorithms.

**Supported algorithms:** `sha256`, `sha384`, `sha512`, `sha3-256`,
`sha3-512`, `blake2b`, `blake3`

### `useSignature()`

Digital signature creation and verification.

**Supported algorithms:** `ed25519`, `ed448`, `ecdsa-p256`,
`ecdsa-p384`, `schnorr`, `ml-dsa-44`, `ml-dsa-65`, `ml-dsa-87`

<p align="right"><a href="#contents">Back to Top</a></p>

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

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-vue run build
pnpm --filter @sebastienrousseau/crypto-vue run test
pnpm --filter @sebastienrousseau/crypto-vue run lint
pnpm --filter @sebastienrousseau/crypto-vue run format
```

All 18 packages in the Crypto Service workspace maintain a **100% coverage floor** across statements, branches, functions, and lines.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories) or according to [`SECURITY.md`](../../SECURITY.md). Never report security issues publicly.

Cryptographic operations use the `@noble/*` libraries, Node.js `crypto` and OpenPGP.js. `@noble/post-quantum` has not been independently audited and does not guarantee constant-time execution, and no module in this suite is FIPS 140-3 validated. Key zeroization is limited: JavaScript strings and garbage-collected buffers cannot be reliably wiped. See [`SECURITY.md`](../../SECURITY.md).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Documentation

- [Full Suite Documentation](https://sebastienrousseau.github.io/crypto-service/)
- [API Reference (TypeDoc)](https://sebastienrousseau.github.io/crypto-service/)
- [Developer Guide](../../DEVELOPMENT.md)
- [Security Policy](../../SECURITY.md)
- [Architecture & Design](../../ARCHITECTURE.md)

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Stability guarantees

Versions advance strictly one step at a time on the `0.0.x` line (`v0.0.1` → `v0.0.2` → `v0.0.3` ... → `v0.0.999` → `v0.1.0`). Work for every release iteration begins on a dedicated `feat/v<version>` branch.

All 18 packages in the workspace move in lockstep. Public API signatures, cipher output formats, and serialization schemas are strictly versioned. Breaking changes to serialized formats or algorithm defaults are considered major breaking changes. Minimum toolchain upgrades (e.g. Node.js LTS floor) are governed by [POLICIES.md](../../docs/POLICIES.md).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service Suite contributors.

<p align="right"><a href="#contents">Back to Top</a></p>
