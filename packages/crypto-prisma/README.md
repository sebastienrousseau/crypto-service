<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-prisma-logo.svg" alt="crypto-prisma logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-prisma</h1>

<p align="center">
  Transparent field-level encryption extension for Prisma Client, powered by AES-256-GCM.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-prisma"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-prisma.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
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
pnpm add @sebastienrousseau/crypto-prisma
# or
npm install @sebastienrousseau/crypto-prisma
# or
yarn add @sebastienrousseau/crypto-prisma
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
import { PrismaClient } from "@prisma/client";
import { createEncryptionMiddleware } from "@sebastienrousseau/crypto-prisma";

const prisma = new PrismaClient();

prisma.$use(
  createEncryptionMiddleware({
    key: process.env.FIELD_ENCRYPTION_KEY!, // 64-char hex (256-bit)
    encryptedFields: [
      { model: "User", fields: ["email", "phone"] },
      { model: "Patient", fields: ["ssn", "diagnosis"] },
    ],
  }),
);

// Usage is completely transparent:
const user = await prisma.user.create({
  data: { name: "Alice", email: "alice@example.com", phone: "+1-555-0100" },
});
// email and phone are encrypted in the database
// but returned as plaintext to your application
console.log(user.email); // "alice@example.com"
```

Or use the Client Extension (Prisma 4.16+):

```ts
import { PrismaClient } from "@prisma/client";
import { createFieldEncryptionExtension } from "@sebastienrousseau/crypto-prisma";

const prisma = new PrismaClient().$extends(
  createFieldEncryptionExtension({
    key: process.env.FIELD_ENCRYPTION_KEY!,
    encryptedFields: [{ model: "User", fields: ["email", "phone"] }],
  }),
);
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## The Crypto Service ecosystem

Crypto Service provides a complete cryptography stack across 14 specialized packages:

| Package                                                                     | Role            | Description                                                                                                                            |
| :-------------------------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](../crypto-api)                            | API Schemas     | Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.                                |
| [`@sebastienrousseau/crypto-cli`](../crypto-cli)                            | Terminal CLI    | An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms. |
| [`@sebastienrousseau/crypto-edge`](../crypto-edge)                          | Edge Runtime    | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.               |
| [`@sebastienrousseau/crypto-kms`](../crypto-kms)                            | Cloud KMS       | Unified Key Management Service interface for AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.                             |
| [`@sebastienrousseau/crypto-lib`](../crypto-lib)                            | Core Library    | A modern cryptographic library for TypeScript, with post-quantum support, zero unsafe dependencies, and 100% test coverage.            |
| [`@sebastienrousseau/crypto-middleware`](../crypto-middleware)              | Middleware      | Framework-agnostic cryptographic middleware for Express, Fastify, and Koa applications.                                                |
| **[`@sebastienrousseau/crypto-prisma`](../crypto-prisma)** _(this package)_ | **ORM Adapter** | **Transparent field-level encryption extension for Prisma Client, powered by AES-256-GCM.**                                            |
| [`@sebastienrousseau/crypto-react`](../crypto-react)                        | React Hooks     | React hooks and context provider for client-side cryptographic operations with zero boilerplate.                                       |
| [`@sebastienrousseau/crypto-sdk`](../crypto-sdk)                            | Client SDK      | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                                  |
| [`@sebastienrousseau/crypto-server`](../crypto-server)                      | HTTP API        | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.             |
| [`@sebastienrousseau/crypto-testing`](../crypto-testing)                    | Test Support    | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                                       |
| [`@sebastienrousseau/crypto-typeorm`](../crypto-typeorm)                    | ORM Adapter     | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                        |
| [`@sebastienrousseau/crypto-vue`](../crypto-vue)                            | Vue Composables | Vue 3 composables for client-side cryptography                                                                                         |
| [`@sebastienrousseau/crypto-wasm`](../crypto-wasm)                          | Acceleration    | WebAssembly performance accelerator for crypto-lib                                                                                     |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-prisma provides transparent field-level encryption for Prisma
ORM. It intercepts write operations (`create`, `update`, `upsert`,
`createMany`) to encrypt configured fields with XChaCha20-Poly1305
before they reach the database, and decrypts them transparently on
read. A deterministic HMAC-SHA-256 mode enables exact-match queries
on encrypted columns. Both the classic `$use()` middleware and the
modern `$extends()` Client Extension API are supported.

<p align="right"><a href="#contents">Back to Top</a></p>
## Features

| Feature                    | Detail                                                                                                                                                                              |
| :------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Encrypt on write**       | `create`, `update`, `upsert`, and `createMany` fields are encrypted with XChaCha20-Poly1305 (secretbox) before reaching the database. Each write uses a fresh random 24-byte nonce. |
| **Decrypt on read**        | `findUnique`, `findFirst`, and `findMany` results are decrypted transparently.                                                                                                      |
| **Graceful fallback**      | If decryption fails, the original value is returned as-is, making migration seamless.                                                                                               |
| **Searchable fields**      | Deterministic HMAC-SHA-256 mode for exact-match `WHERE` queries on encrypted columns.                                                                                               |
| **Two integration styles** | Classic `$use()` middleware and the modern `$extends()` Client Extension API.                                                                                                       |
| **Zero native deps**       | Built on `@sebastienrousseau/crypto-lib` which uses the audited `@noble/*` family.                                                                                                  |

<p align="right"><a href="#contents">Back to Top</a></p>
## Configuration

| Option                | Type            | Required | Default                | Description                                    |
| :-------------------- | :-------------- | :------- | :--------------------- | :--------------------------------------------- |
| `key`                 | `string`        | Yes      | --                     | 64-character hex string (256-bit key)          |
| `encryptedFields`     | `FieldConfig[]` | Yes      | --                     | Models and their fields to encrypt             |
| `algorithm`           | `string`        | No       | `"xchacha20-poly1305"` | Encryption algorithm                           |
| `deterministicFields` | `string[]`      | No       | `[]`                   | Fields that use HMAC for searchable encryption |

<p align="right"><a href="#contents">Back to Top</a></p>
## Searchable Encryption

For fields you need to query by exact match, use deterministic
encryption via HMAC-SHA-256:

```ts
prisma.$use(
  createEncryptionMiddleware({
    key: process.env.FIELD_ENCRYPTION_KEY!,
    encryptedFields: [{ model: "User", fields: ["email", "phone"] }],
    deterministicFields: ["email"], // email is searchable
  }),
);

// This works because email is hashed deterministically:
const user = await prisma.user.findFirst({
  where: { email: "alice@example.com" },
});
```

**Trade-off:** Deterministic fields reveal when two rows have the
same value for that field. Use this only for fields where exact-match
search is essential.

<p align="right"><a href="#contents">Back to Top</a></p>
## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category   | Example                                 | Purpose                                                |
| :--------- | :-------------------------------------- | :----------------------------------------------------- |
| Middleware | [middleware.ts](examples/middleware.ts) | Basic middleware setup and transparent encrypt/decrypt |
| Extension  | [extension.ts](examples/extension.ts)   | Client Extension approach (Prisma 4.16+)               |
| Searchable | [searchable.ts](examples/searchable.ts) | Deterministic HMAC encryption for exact-match search   |
| Migration  | [migration.ts](examples/migration.ts)   | Migrate existing plaintext data to encrypted storage   |

<p align="right"><a href="#contents">Back to Top</a></p>

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-prisma run build
pnpm --filter @sebastienrousseau/crypto-prisma run test
pnpm --filter @sebastienrousseau/crypto-prisma run lint
pnpm --filter @sebastienrousseau/crypto-prisma run format
```

All 14 packages in the Crypto Service workspace maintain a **100% coverage floor** across statements, branches, functions, and lines.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories) or according to [`SECURITY.md`](../../SECURITY.md). Never report security issues publicly.

All cryptographic operations leverage audited primitives, enforce constant-time execution where applicable, and zero sensitive key material upon disposal.

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

All 14 packages in the workspace move in lockstep. Public API signatures, cipher output formats, and serialization schemas are strictly versioned. Breaking changes to serialized formats or algorithm defaults are considered major breaking changes. Minimum toolchain upgrades (e.g. Node.js LTS floor) are governed by [POLICIES.md](../../docs/POLICIES.md).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service Suite contributors.

<p align="right"><a href="#contents">Back to Top</a></p>
