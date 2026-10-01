<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-api-logo.svg" alt="crypto-api logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-api</h1>

<p align="center">
  Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-api"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-api.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
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
pnpm add @sebastienrousseau/crypto-api
# or
npm install @sebastienrousseau/crypto-api
# or
yarn add @sebastienrousseau/crypto-api
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

Import shared types and use them to build type-safe requests and
responses across `crypto-server` and `crypto-sdk`.

```ts
import type {
  AuthorizationToken,
  AuthorizationInfo,
  CollectionItem,
  JsonDocument,
  JsonRequest,
  RequestHeader,
  ResponseType,
} from "@sebastienrousseau/crypto-api/dist/@types/types";

// Type-safe request header
const header: RequestHeader = {
  key: "Content-Type",
  value: "application/json",
  description: "Request content type",
};

// Build a typed JSON request
const request: JsonRequest = {
  header: [header],
  key: "encrypt",
  value: "aes-256-gcm",
  description: "Encrypt payload with AES-256-GCM",
};
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## The Crypto Service ecosystem

Crypto Service provides a complete cryptography stack across 14 specialized packages:

| Package                                                               | Role            | Description                                                                                                                            |
| :-------------------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| **[`@sebastienrousseau/crypto-api`](../crypto-api)** _(this package)_ | **API Schemas** | **Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.**                            |
| [`@sebastienrousseau/crypto-cli`](../crypto-cli)                      | Terminal CLI    | An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms. |
| [`@sebastienrousseau/crypto-edge`](../crypto-edge)                    | Edge Runtime    | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.               |
| [`@sebastienrousseau/crypto-kms`](../crypto-kms)                      | Cloud KMS       | Unified Key Management Service interface for AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.                             |
| [`@sebastienrousseau/crypto-lib`](../crypto-lib)                      | Core Library    | A modern cryptographic library for TypeScript, with post-quantum support, zero unsafe dependencies, and 100% test coverage.            |
| [`@sebastienrousseau/crypto-middleware`](../crypto-middleware)        | Middleware      | Framework-agnostic cryptographic middleware for Express, Fastify, and Koa applications.                                                |
| [`@sebastienrousseau/crypto-prisma`](../crypto-prisma)                | ORM Adapter     | Transparent field-level encryption extension for Prisma Client, using XChaCha20-Poly1305.                                              |
| [`@sebastienrousseau/crypto-react`](../crypto-react)                  | React Hooks     | React hooks and context provider for client-side cryptographic operations with zero boilerplate.                                       |
| [`@sebastienrousseau/crypto-sdk`](../crypto-sdk)                      | Client SDK      | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                                  |
| [`@sebastienrousseau/crypto-server`](../crypto-server)                | HTTP API        | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.             |
| [`@sebastienrousseau/crypto-testing`](../crypto-testing)              | Test Support    | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                                       |
| [`@sebastienrousseau/crypto-typeorm`](../crypto-typeorm)              | ORM Adapter     | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                        |
| [`@sebastienrousseau/crypto-vue`](../crypto-vue)                      | Vue Composables | Vue 3 composables for client-side cryptography                                                                                         |
| [`@sebastienrousseau/crypto-wasm`](../crypto-wasm)                    | Acceleration    | WebAssembly performance accelerator for crypto-lib                                                                                     |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-api provides the shared TypeScript type definitions and
utility functions used across the Crypto Service Suite. It defines
the canonical API surface -- request headers, response types,
authorization tokens, and collection items -- that `crypto-server`,
`crypto-sdk`, and other packages depend on. Utility functions convert
Postman-style JSON collections into Markdown documentation.

<p align="right"><a href="#contents">Back to Top</a></p>

## Features

### Exported Types

All types are exported from `src/@types/types.ts`.

| Type                 | Description                                                                     |
| :------------------- | :------------------------------------------------------------------------------ |
| `AuthorizationToken` | A single authorization token with `key`, `type`, and `value` fields             |
| `AuthorizationInfo`  | Full authorization payload including bearer tokens and metadata                 |
| `CollectionItem`     | A Postman-style collection item -- either a folder with children or an endpoint |
| `JsonDocument`       | Top-level document with `info` metadata and an array of `CollectionItem`s       |
| `MethodType`         | A named method with optional `request` and `response` details                   |
| `JsonRequest`        | An API request shape with headers, key/value pair, and description              |
| `RequestHeader`      | A single request header with `key`, `value`, and `description`                  |
| `ResponseType`       | A response entry with HTTP `code`, `status`, and `body`                         |

### Utilities

Utility functions are exported from `src/utils/index.ts`. They
convert Postman-style JSON collections into Markdown documentation.

| Function            | Description                                         |
| :------------------ | :-------------------------------------------------- |
| `createMarkdown`    | Converts a full JSON document to Markdown           |
| `readAuthorization` | Renders authorization info as a Markdown table      |
| `readRequest`       | Renders request headers as a Markdown table         |
| `readQueryParams`   | Renders query parameters as a Markdown table        |
| `readFormDataBody`  | Renders raw or form-data request bodies in Markdown |
| `readResponse`      | Renders response codes and an example response body |
| `readMethods`       | Renders a single API method with all its sections   |
| `readItems`         | Recursively renders a collection tree to Markdown   |
| `response`          | Writes generated Markdown to a file on disk         |

<p align="right"><a href="#contents">Back to Top</a></p>

## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category   | Example                                 | Purpose                                |
| :--------- | :-------------------------------------- | :------------------------------------- |
| Types      | [types.ts](examples/types.ts)           | Using API types for type-safe requests |
| Utilities  | [utilities.ts](examples/utilities.ts)   | Using exported utility functions       |
| Validation | [validation.ts](examples/validation.ts) | Validating API payloads against types  |

<p align="right"><a href="#contents">Back to Top</a></p>

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-api run build
pnpm --filter @sebastienrousseau/crypto-api run test
pnpm --filter @sebastienrousseau/crypto-api run lint
pnpm --filter @sebastienrousseau/crypto-api run format
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
