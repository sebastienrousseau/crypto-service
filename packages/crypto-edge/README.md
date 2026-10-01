<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-edge-logo.svg" alt="crypto-edge logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-edge</h1>

<p align="center">
  Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-edge"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-edge.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
  <a href="https://sebastienrousseau.github.io/crypto-service/"><img src="https://img.shields.io/badge/docs-TypeDoc-blue.svg?style=for-the-badge&labelColor=555555&logo=typescript" alt="Docs" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/sebastienrousseau/crypto-service" title="ossf-scorecard"><img src="https://img.shields.io/badge/OpenSSF-Scorecard-blue?style=for-the-badge&logo=openssf" alt="OpenSSF Scorecard" /></a>
  <a href="https://github.com/sebastienrousseau/crypto-service/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg?style=for-the-badge" alt="License: Apache-2.0 OR MIT" /></a>
  <a href="https://github.com/sebastienrousseau/crypto-service/blob/main/docs/POLICIES.md"><img src="https://img.shields.io/badge/Node.js-%3E%3D22-93450a.svg?style=for-the-badge&logo=node.js" alt="Node.js 22 or newer" /></a>
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
pnpm add @sebastienrousseau/crypto-edge
# or
npm install @sebastienrousseau/crypto-edge
# or
yarn add @sebastienrousseau/crypto-edge
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

```ts
import { hash, detectRuntime } from "@sebastienrousseau/crypto-edge";

console.log("Running on:", detectRuntime());

const digest = await hash("SHA-256", "hello world");
console.log(digest);
// b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## The Crypto Service ecosystem

Crypto Service provides a complete cryptography stack across 14 specialized packages:

| Package                                                                 | Role             | Description                                                                                                                            |
| :---------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](../crypto-api)                        | API Schemas      | Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.                                |
| [`@sebastienrousseau/crypto-cli`](../crypto-cli)                        | Terminal CLI     | An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms. |
| **[`@sebastienrousseau/crypto-edge`](../crypto-edge)** _(this package)_ | **Edge Runtime** | **Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.**           |
| [`@sebastienrousseau/crypto-kms`](../crypto-kms)                        | Cloud KMS        | Unified Key Management Service interface for AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.                             |
| [`@sebastienrousseau/crypto-lib`](../crypto-lib)                        | Core Library     | A modern cryptographic library for TypeScript, with post-quantum support, zero unsafe dependencies, and 100% test coverage.            |
| [`@sebastienrousseau/crypto-middleware`](../crypto-middleware)          | Middleware       | Framework-agnostic cryptographic middleware for Express, Fastify, and Koa applications.                                                |
| [`@sebastienrousseau/crypto-prisma`](../crypto-prisma)                  | ORM Adapter      | Transparent field-level encryption extension for Prisma Client, powered by AES-256-GCM.                                                |
| [`@sebastienrousseau/crypto-react`](../crypto-react)                    | React Hooks      | React hooks and context provider for client-side cryptographic operations with zero boilerplate.                                       |
| [`@sebastienrousseau/crypto-sdk`](../crypto-sdk)                        | Client SDK       | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                                  |
| [`@sebastienrousseau/crypto-server`](../crypto-server)                  | HTTP API         | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.             |
| [`@sebastienrousseau/crypto-testing`](../crypto-testing)                | Test Support     | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                                       |
| [`@sebastienrousseau/crypto-typeorm`](../crypto-typeorm)                | ORM Adapter      | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                        |
| [`@sebastienrousseau/crypto-vue`](../crypto-vue)                        | Vue Composables  | Vue 3 composables for client-side cryptography                                                                                         |
| [`@sebastienrousseau/crypto-wasm`](../crypto-wasm)                      | Acceleration     | WebAssembly performance accelerator for crypto-lib                                                                                     |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-edge adapts the Crypto Service Suite for edge and serverless
runtimes. It provides runtime detection, a Web Crypto wrapper for
hashing, AES-GCM encryption, HMAC signing, and key generation, plus
polyfills for minimal environments. All functions use only the
standard Web Crypto API -- no Node.js built-ins are imported.

<p align="right"><a href="#contents">Back to Top</a></p>
## Supported Runtimes

| Runtime            | Identifier           | Web Crypto | Notes                            |
| :----------------- | :------------------- | :--------: | :------------------------------- |
| Cloudflare Workers | `cloudflare-workers` |    Yes     | Full support                     |
| Vercel Edge        | `vercel-edge`        |    Yes     | Full support                     |
| Deno               | `deno`               |    Yes     | Full support                     |
| Bun                | `bun`                |    Yes     | Full support                     |
| Browsers           | `browser`            |    Yes     | Modern browsers (Chrome 37+)     |
| Node.js            | `node`               |    Yes     | Node >= 15 (globalThis.crypto)   |
| Unknown            | `unknown`            |   Varies   | Use `getCapabilities()` to check |

<p align="right"><a href="#contents">Back to Top</a></p>
## Features

### Runtime Detection

```ts
import {
  detectRuntime,
  getCapabilities,
  isEdgeCryptoAvailable,
} from "@sebastienrousseau/crypto-edge";

const runtime = detectRuntime();
const caps = getCapabilities();
if (isEdgeCryptoAvailable()) {
  // Safe to call hash(), encrypt(), etc.
}
```

### Web Crypto API

```ts
import {
  hash,
  generateKey,
  encrypt,
  decrypt,
} from "@sebastienrousseau/crypto-edge";

// Hashing
const sha256 = await hash("SHA-256", "hello");

// Encryption / Decryption (AES-GCM)
const key = await generateKey({ algorithm: "AES-GCM", length: 256 });
const { ciphertext } = await encrypt({
  key,
  plaintext: new TextEncoder().encode("secret"),
});
const plaintext = await decrypt({ key, ciphertext });
```

### Polyfills

Call `installPolyfills()` once at startup for minimal runtimes
missing standard globals:

```ts
import { installPolyfills } from "@sebastienrousseau/crypto-edge";

const installed = installPolyfills();
```

Polyfills provided: `TextEncoder`, `TextDecoder`, `btoa`, and `atob`.
`crypto.getRandomValues` is never polyfilled: without a native CSPRNG,
`randomBytes()` throws rather than fall back to predictable output.

<p align="right"><a href="#contents">Back to Top</a></p>
## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category   | Example                             | Purpose                     |
| :--------- | :---------------------------------- | :-------------------------- |
| Detection  | [detect.ts](examples/detect.ts)     | Runtime detection           |
| Hashing    | [hash.ts](examples/hash.ts)         | Edge-compatible hashing     |
| Encryption | [encrypt.ts](examples/encrypt.ts)   | AES-GCM encrypt and decrypt |
| Workers    | [workers.ts](examples/workers.ts)   | Cloudflare Workers usage    |
| Vercel     | [vercel.ts](examples/vercel.ts)     | Vercel Edge Function usage  |
| Browser    | [browser.ts](examples/browser.ts)   | Browser usage               |
| Polyfills  | [polyfill.ts](examples/polyfill.ts) | Polyfill installation       |

<p align="right"><a href="#contents">Back to Top</a></p>

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-edge run build
pnpm --filter @sebastienrousseau/crypto-edge run test
pnpm --filter @sebastienrousseau/crypto-edge run lint
pnpm --filter @sebastienrousseau/crypto-edge run format
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
