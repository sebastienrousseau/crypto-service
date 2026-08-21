<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-service-logo.svg" alt="Crypto Service Suite logo" width="128" />
</p>

<h1 align="center">Crypto Service Suite</h1>

<p align="center">
  A monorepo of cryptographic libraries, server, CLI, SDK, and ecosystem
  integrations for TypeScript — with post-quantum support and 100% test coverage.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen?style=for-the-badge&logo=node.js" alt="Node" /></a>
</p>

---

## Contents

- [Packages](#packages) — all 14 packages at a glance
- [Quick Start](#quick-start) — install, build, test, run
- [Architecture](#architecture) — dependency graph
- [Coverage](#coverage) — per-package test metrics
- [License](#license) — Apache-2.0 OR MIT

---

## Packages

### Core

| Package                           | Description                                                           | Version |
| :-------------------------------- | :-------------------------------------------------------------------- | :------ |
| [`crypto-lib`](crypto-lib/)       | Core cryptographic library — hash, encrypt, sign, KEM, KDF, protocols | 0.0.3   |
| [`crypto-server`](crypto-server/) | Fastify REST API exposing all crypto operations over HTTP             | 0.0.3   |
| [`crypto-cli`](crypto-cli/)       | Interactive CLI for cryptographic operations (legacy + modern)        | 0.0.3   |
| [`crypto-sdk`](crypto-sdk/)       | Zero-dependency typed HTTP client for the REST API                    | 0.0.3   |
| [`crypto-api`](crypto-api/)       | Shared TypeScript types and utilities for the API surface             | 0.0.3   |

### Enterprise

| Package                             | Description                                                              | Version |
| :---------------------------------- | :----------------------------------------------------------------------- | :------ |
| [`crypto-kms`](crypto-kms/)         | Adapters for AWS KMS, Google Cloud KMS, Azure Key Vault, HashiCorp Vault | 0.0.3   |
| [`crypto-prisma`](crypto-prisma/)   | Prisma ORM field-level encryption middleware and client extension        | 0.0.3   |
| [`crypto-typeorm`](crypto-typeorm/) | TypeORM column encryption via decorators, subscribers, and transformers  | 0.0.3   |

### Frontend

| Package                         | Description                                                                | Version |
| :------------------------------ | :------------------------------------------------------------------------- | :------ |
| [`crypto-react`](crypto-react/) | React hooks for client-side cryptography (useKeypair, useEncrypt, useHash) | 0.0.3   |
| [`crypto-vue`](crypto-vue/)     | Vue 3 composables for client-side cryptography with reactive state         | 0.0.3   |

### Infrastructure

| Package                                   | Description                                                                   | Version |
| :---------------------------------------- | :---------------------------------------------------------------------------- | :------ |
| [`crypto-middleware`](crypto-middleware/) | Express and Fastify middleware for payload encryption, signature verification | 0.0.3   |
| [`crypto-edge`](crypto-edge/)             | Edge runtime adapter for Cloudflare Workers, Vercel Edge, Deno, Bun           | 0.0.3   |

### Developer Experience

| Package                             | Description                                                 | Version |
| :---------------------------------- | :---------------------------------------------------------- | :------ |
| [`crypto-testing`](crypto-testing/) | Deterministic keys, fast mocks, and test fixtures for CI/CD | 0.0.3   |
| [`crypto-wasm`](crypto-wasm/)       | WebAssembly accelerator for near-native crypto performance  | 0.0.3   |

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Start the server
pnpm start:server
```

---

## Architecture

```
crypto-service/
  packages/
    crypto-lib/           Core library (noble primitives, PQ, protocols)
    crypto-server/        Fastify REST API (v1 deprecated, v2 modern)
    crypto-cli/           Interactive CLI (OpenPGP legacy + modern)
    crypto-sdk/           Typed HTTP client (fetch-based)
    crypto-api/           Shared types and utilities
    crypto-kms/           Enterprise KMS adapters (AWS, GCP, Azure, Vault)
    crypto-prisma/        Prisma ORM field-level encryption
    crypto-typeorm/       TypeORM column-level encryption
    crypto-react/         React hooks (useKeypair, useEncrypt, useHash)
    crypto-vue/           Vue 3 composables (useKeypair, useEncrypt, useHash)
    crypto-middleware/    Express + Fastify middleware
    crypto-edge/          Edge/serverless runtime adapter
    crypto-testing/       Test utilities, mocks, fixtures
    crypto-wasm/          WebAssembly performance accelerator
```

**Dependency graph:**

- `crypto-server`, `crypto-cli` depend on `crypto-lib`
- `crypto-sdk` is standalone (fetch-based, talks to `crypto-server`)
- `crypto-kms`, `crypto-prisma`, `crypto-typeorm` depend on `crypto-lib`
- `crypto-react`, `crypto-vue` depend on `crypto-lib`
- `crypto-middleware` depends on `crypto-lib`
- `crypto-edge` adapts `crypto-lib` for non-Node runtimes
- `crypto-testing` provides test utilities for `crypto-lib`
- `crypto-wasm` accelerates `crypto-lib` with WASM

---

## Coverage

| Package       | Statements | Branches |    Lines |     Tests |
| :------------ | ---------: | -------: | -------: | --------: |
| crypto-lib    |       100% |     100% |     100% |       617 |
| crypto-server |       100% |     100% |     100% |       271 |
| crypto-cli    |       100% |     100% |     100% |        89 |
| crypto-sdk    |       100% |     100% |     100% |        60 |
| crypto-api    |       100% |     100% |     100% |       116 |
| **Total**     |   **100%** | **100%** | **100%** | **1,153** |

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

<p align="right"><a href="#contents">Back to Top</a></p>
