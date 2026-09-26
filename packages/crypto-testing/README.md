<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-testing-logo.svg" alt="crypto-testing logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-testing</h1>

<p align="center">
  Deterministic keys, fast mocks, and test fixtures for crypto-lib — make your CI/CD pipeline fast and reproducible.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-testing"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-testing.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
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
pnpm add @sebastienrousseau/crypto-testing
# or
npm install @sebastienrousseau/crypto-testing
# or
yarn add @sebastienrousseau/crypto-testing
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
import {
  TEST_KEYS,
  TEST_VECTORS,
  mockEncrypt,
  mockDecrypt,
  createTestKeyring,
  expectValidHex,
  expectSignVerifyRoundTrip,
} from "@sebastienrousseau/crypto-testing";

// Use deterministic keys instead of generating new ones every run
const { publicKey, privateKey } = TEST_KEYS.ed25519;

// Mock encrypt/decrypt for fast unit tests
const ct = mockEncrypt(TEST_KEYS.aes256, "secret data");
const pt = mockDecrypt(TEST_KEYS.aes256, ct);

// Validate outputs
expectValidHex(publicKey, 32);

// Full sign/verify round-trip with real crypto-lib
expectSignVerifyRoundTrip("ed25519");
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## The Crypto Service ecosystem

Crypto Service provides a complete cryptography stack across 14 specialized packages:

| Package                                                                       | Role             | Description                                                                                                                            |
| :---------------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](../crypto-api)                              | API Schemas      | Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.                                |
| [`@sebastienrousseau/crypto-cli`](../crypto-cli)                              | Terminal CLI     | An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms. |
| [`@sebastienrousseau/crypto-edge`](../crypto-edge)                            | Edge Runtime     | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.               |
| [`@sebastienrousseau/crypto-kms`](../crypto-kms)                              | Cloud KMS        | Unified Key Management Service interface for AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.                             |
| [`@sebastienrousseau/crypto-lib`](../crypto-lib)                              | Core Library     | A modern cryptographic library for TypeScript, with post-quantum support, zero unsafe dependencies, and 100% test coverage.            |
| [`@sebastienrousseau/crypto-middleware`](../crypto-middleware)                | Middleware       | Framework-agnostic cryptographic middleware for Express, Fastify, and Koa applications.                                                |
| [`@sebastienrousseau/crypto-prisma`](../crypto-prisma)                        | ORM Adapter      | Transparent field-level encryption extension for Prisma Client, powered by AES-256-GCM.                                                |
| [`@sebastienrousseau/crypto-react`](../crypto-react)                          | React Hooks      | React hooks and context provider for client-side cryptographic operations with zero boilerplate.                                       |
| [`@sebastienrousseau/crypto-sdk`](../crypto-sdk)                              | Client SDK       | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                                  |
| [`@sebastienrousseau/crypto-server`](../crypto-server)                        | HTTP API         | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.             |
| **[`@sebastienrousseau/crypto-testing`](../crypto-testing)** _(this package)_ | **Test Support** | **Deterministic keys, fast mocks, and test fixtures for crypto-lib**                                                                   |
| [`@sebastienrousseau/crypto-typeorm`](../crypto-typeorm)                      | ORM Adapter      | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                        |
| [`@sebastienrousseau/crypto-vue`](../crypto-vue)                              | Vue Composables  | Vue 3 composables for client-side cryptography                                                                                         |
| [`@sebastienrousseau/crypto-wasm`](../crypto-wasm)                            | Acceleration     | WebAssembly performance accelerator for crypto-lib                                                                                     |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-testing is the test utility package for the Crypto Service
Suite. It provides pre-generated deterministic keys, instant
XOR-based mock functions for expensive crypto operations, one-call
fixture generators, and assertion helpers for hex, Base64, key-pair,
and round-trip validations. Use it to make your CI/CD pipeline fast
and reproducible without sacrificing coverage.

<p align="right"><a href="#contents">Back to Top</a></p>
## Features

| Category       | What you get                                                                  |
| :------------- | :---------------------------------------------------------------------------- |
| **Keys**       | Pre-generated Ed25519, X25519, P-256, AES-256, and HMAC key pairs/keys        |
| **Vectors**    | Known plaintext with expected SHA-256, SHA3-256, and BLAKE3 digests           |
| **Mocks**      | Instant XOR-based fakes for encrypt, decrypt, sign, verify, password hashing  |
| **Fixtures**   | One-call generators for keyrings, encrypted messages, signed messages, hashes |
| **Assertions** | Hex, Base64, key-pair, encrypt/decrypt, and sign/verify round-trip helpers    |

<p align="right"><a href="#contents">Back to Top</a></p>
## Deterministic Keys

`TEST_KEYS` provides well-known key pairs that never change between
runs:

| Key       | Algorithm | Description                      |
| :-------- | :-------- | :------------------------------- |
| `ed25519` | Ed25519   | 32-byte signing key pair         |
| `x25519`  | X25519    | 32-byte key-exchange pair        |
| `p256`    | P-256     | ECDSA signing key pair           |
| `aes256`  | AES-256   | 32-byte symmetric encryption key |
| `hmacKey` | HMAC      | 32-byte HMAC key                 |

`TEST_VECTORS` includes a known plaintext and its expected hashes.

<p align="right"><a href="#contents">Back to Top</a></p>
## Mock Functions

Replace expensive crypto operations with instant, deterministic
fakes:

| Function              | Replaces                 | Speed     |
| :-------------------- | :----------------------- | :-------- |
| `mockHashPassword`    | Argon2id (100+ ms)       | < 0.01 ms |
| `mockGenerateKeyPair` | Real key generation      | < 0.01 ms |
| `mockEncrypt`         | XChaCha20-Poly1305       | < 0.01 ms |
| `mockDecrypt`         | XChaCha20-Poly1305       | < 0.01 ms |
| `mockSign`            | Ed25519/ECDSA signatures | < 0.01 ms |
| `mockVerify`          | Signature verification   | < 0.01 ms |

All mock functions use XOR internally -- they are **not
cryptographically secure** but are deterministic and round-trip
correctly.

<p align="right"><a href="#contents">Back to Top</a></p>
## Fixtures

Fixture generators produce complete test data structures in one
call:

| Function                       | Returns                                                         |
| :----------------------------- | :-------------------------------------------------------------- |
| `createTestKeyring()`          | Keyring with signing, exchange, ECDSA, symmetric, and HMAC keys |
| `createTestEncryptedMessage()` | Key + plaintext + mock ciphertext                               |
| `createTestSignedMessage()`    | Key pair + message + mock signature                             |
| `createTestPasswordHash()`     | Hash + salt + params + PHC string                               |

<p align="right"><a href="#contents">Back to Top</a></p>
## Assertion Helpers

One-liner assertions that throw descriptive errors on failure:

| Helper                          | Checks                                 |
| :------------------------------ | :------------------------------------- |
| `expectValidHex(value, len?)`   | Valid hex string, optional byte length |
| `expectValidBase64(value)`      | Valid Base64 string with round-trip    |
| `expectKeyPair(kp)`             | Non-empty hex keys, pub != priv        |
| `expectEncryptDecryptRoundTrip` | Real secretbox encrypt then decrypt    |
| `expectSignVerifyRoundTrip`     | Real keygen, sign, and verify          |

<p align="right"><a href="#contents">Back to Top</a></p>
## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category   | Example                                 | Purpose                             |
| :--------- | :-------------------------------------- | :---------------------------------- |
| Keys       | [keys.ts](examples/keys.ts)             | Using deterministic test keys       |
| Mocks      | [mocks.ts](examples/mocks.ts)           | Mocking crypto operations for speed |
| Fixtures   | [fixtures.ts](examples/fixtures.ts)     | Using pre-built test fixtures       |
| Assertions | [assertions.ts](examples/assertions.ts) | Assertion helpers in tests          |

<p align="right"><a href="#contents">Back to Top</a></p>

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-testing run build
pnpm --filter @sebastienrousseau/crypto-testing run test
pnpm --filter @sebastienrousseau/crypto-testing run lint
pnpm --filter @sebastienrousseau/crypto-testing run format
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
