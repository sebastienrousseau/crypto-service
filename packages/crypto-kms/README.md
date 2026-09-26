<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-kms-logo.svg" alt="crypto-kms logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-kms</h1>

<p align="center">
  Unified Key Management Service interface for AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-kms"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-kms.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
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
pnpm add @sebastienrousseau/crypto-kms
# or
npm install @sebastienrousseau/crypto-kms
# or
yarn add @sebastienrousseau/crypto-kms
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
import { LocalKmsProvider } from "@sebastienrousseau/crypto-kms";

const kms = new LocalKmsProvider();
const key = await kms.createKey("aes-256-gcm", "encrypt");
const encrypted = await kms.encrypt(
  key.keyId,
  new TextEncoder().encode("secret"),
);
const decrypted = await kms.decrypt(key.keyId, encrypted.ciphertext);
console.log(new TextDecoder().decode(decrypted.plaintext)); // "secret"
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## The Crypto Service ecosystem

Crypto Service provides a complete cryptography stack across 14 specialized packages:

| Package                                                               | Role            | Description                                                                                                                            |
| :-------------------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](../crypto-api)                      | API Schemas     | Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.                                |
| [`@sebastienrousseau/crypto-cli`](../crypto-cli)                      | Terminal CLI    | An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms. |
| [`@sebastienrousseau/crypto-edge`](../crypto-edge)                    | Edge Runtime    | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.               |
| **[`@sebastienrousseau/crypto-kms`](../crypto-kms)** _(this package)_ | **Cloud KMS**   | **Unified Key Management Service interface for AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.**                         |
| [`@sebastienrousseau/crypto-lib`](../crypto-lib)                      | Core Library    | A modern cryptographic library for TypeScript, with post-quantum support, zero unsafe dependencies, and 100% test coverage.            |
| [`@sebastienrousseau/crypto-middleware`](../crypto-middleware)        | Middleware      | Framework-agnostic cryptographic middleware for Express, Fastify, and Koa applications.                                                |
| [`@sebastienrousseau/crypto-prisma`](../crypto-prisma)                | ORM Adapter     | Transparent field-level encryption extension for Prisma Client, powered by AES-256-GCM.                                                |
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

crypto-kms provides a unified `KmsProvider` interface over multiple
key management backends -- AWS KMS, Google Cloud KMS, Azure Key
Vault, HashiCorp Vault, and an in-memory local provider. All
providers expose the same methods for key creation, encryption,
decryption, signing, verification, rotation, and data-key
generation, making it trivial to swap backends without changing
application code.

<p align="right"><a href="#contents">Back to Top</a></p>
## Providers

| Provider  | Class              | Backend                    | Peer Dependency        |
| :-------- | :----------------- | :------------------------- | :--------------------- |
| **AWS**   | `AwsKmsProvider`   | AWS Key Management Service | `@aws-sdk/client-kms`  |
| **GCP**   | `GcpKmsProvider`   | Google Cloud KMS           | `@google-cloud/kms`    |
| **Azure** | `AzureKmsProvider` | Azure Key Vault            | `@azure/keyvault-keys` |
| **Vault** | `VaultKmsProvider` | HashiCorp Vault Transit    | None (uses `fetch`)    |
| **Local** | `LocalKmsProvider` | In-memory (crypto-lib)     | None                   |

<p align="right"><a href="#contents">Back to Top</a></p>
## API Reference

Every provider exposes the `KmsProvider` interface:

| Method                                       | Description                                  |
| :------------------------------------------- | :------------------------------------------- |
| `listKeys(filters?)`                         | List all managed keys, with optional filters |
| `getKey(keyId)`                              | Retrieve metadata for a specific key         |
| `createKey(algorithm, usage, metadata?)`     | Create a new managed key                     |
| `enableKey(keyId)`                           | Enable a disabled key                        |
| `disableKey(keyId)`                          | Disable a key (soft delete)                  |
| `scheduleKeyDeletion(keyId, days?)`          | Schedule a key for deletion                  |
| `encrypt(keyId, plaintext, context?)`        | Encrypt plaintext with a managed key         |
| `decrypt(keyId, ciphertext, context?)`       | Decrypt ciphertext with a managed key        |
| `sign(keyId, data, algorithm?)`              | Sign data with a managed signing key         |
| `verify(keyId, data, signature, algorithm?)` | Verify a signature                           |
| `rotateKey(keyId)`                           | Rotate key material (new version)            |
| `generateDataKey(keyId, keySpec?)`           | Generate a wrapped data encryption key       |

<p align="right"><a href="#contents">Back to Top</a></p>
## Authentication

| Provider  | Credentials                                                                        |
| :-------- | :--------------------------------------------------------------------------------- |
| **AWS**   | Pass `credentials` in `AwsKmsOptions`, or rely on the default AWS credential chain |
| **GCP**   | Uses Application Default Credentials (ADC). Set `GOOGLE_APPLICATION_CREDENTIALS`   |
| **Azure** | Uses `@azure/identity` `DefaultAzureCredential`                                    |
| **Vault** | Pass `token` in `VaultKmsOptions`                                                  |
| **Local** | No authentication required                                                         |

<p align="right"><a href="#contents">Back to Top</a></p>
## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category | Example                             | Purpose                                                  |
| :------- | :---------------------------------- | :------------------------------------------------------- |
| Local    | [local.ts](examples/local.ts)       | Create keys, encrypt/decrypt with the in-memory provider |
| AWS      | [aws.ts](examples/aws.ts)           | AWS KMS setup and usage pattern                          |
| Envelope | [envelope.ts](examples/envelope.ts) | Envelope encryption with `generateDataKey`               |
| Rotation | [rotation.ts](examples/rotation.ts) | Key rotation workflow                                    |
| Multi    | [multi.ts](examples/multi.ts)       | Provider-agnostic code across multiple backends          |

<p align="right"><a href="#contents">Back to Top</a></p>

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-kms run build
pnpm --filter @sebastienrousseau/crypto-kms run test
pnpm --filter @sebastienrousseau/crypto-kms run lint
pnpm --filter @sebastienrousseau/crypto-kms run format
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
