<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-cli-logo.svg" alt="crypto-cli logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-cli</h1>

<p align="center">
  An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-cli"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-cli.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
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
pnpm add @sebastienrousseau/crypto-cli
# or
npm install @sebastienrousseau/crypto-cli
# or
yarn add @sebastienrousseau/crypto-cli
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

Launch the interactive menu:

```bash
cryptocli
```

You will be presented with a selection prompt:

```
? Select a function to execute.

  Generate         -- Generate a new OpenPGP key pair
  Encrypt          -- Encrypt a message (OpenPGP)
  Decrypt          -- Decrypt a message (OpenPGP)
  Modern Keygen    -- Generate keys (Ed25519, ML-DSA, ML-KEM, etc.)
  Modern Hash      -- Hash data (SHA-2, SHA-3, BLAKE2b, BLAKE3)
  Modern Encrypt   -- Encrypt (XChaCha20, AES-GCM, AES-GCM-SIV)
  Modern Sign      -- Sign/verify (Ed25519, ECDSA, Schnorr, ML-DSA)
  Password Hash    -- Hash/verify passwords (Argon2id/i/d)
  Help             -- Get help on a command
```

Use arrow keys to navigate, then press Enter to select a command.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## The Crypto Service ecosystem

Crypto Service provides a complete cryptography stack across 14 specialized packages:

| Package                                                               | Role             | Description                                                                                                                                |
| :-------------------------------------------------------------------- | :--------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](../crypto-api)                      | API Schemas      | Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.                                    |
| **[`@sebastienrousseau/crypto-cli`](../crypto-cli)** _(this package)_ | **Terminal CLI** | **An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms.** |
| [`@sebastienrousseau/crypto-edge`](../crypto-edge)                    | Edge Runtime     | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.                   |
| [`@sebastienrousseau/crypto-kms`](../crypto-kms)                      | Cloud KMS        | Unified Key Management Service interface for AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.                                 |
| [`@sebastienrousseau/crypto-lib`](../crypto-lib)                      | Core Library     | A modern cryptographic library for TypeScript, with post-quantum support, zero unsafe dependencies, and 100% test coverage.                |
| [`@sebastienrousseau/crypto-middleware`](../crypto-middleware)        | Middleware       | Framework-agnostic cryptographic middleware for Express, Fastify, and Koa applications.                                                    |
| [`@sebastienrousseau/crypto-prisma`](../crypto-prisma)                | ORM Adapter      | Transparent field-level encryption extension for Prisma Client, powered by AES-256-GCM.                                                    |
| [`@sebastienrousseau/crypto-react`](../crypto-react)                  | React Hooks      | React hooks and context provider for client-side cryptographic operations with zero boilerplate.                                           |
| [`@sebastienrousseau/crypto-sdk`](../crypto-sdk)                      | Client SDK       | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                                      |
| [`@sebastienrousseau/crypto-server`](../crypto-server)                | HTTP API         | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.                 |
| [`@sebastienrousseau/crypto-testing`](../crypto-testing)              | Test Support     | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                                           |
| [`@sebastienrousseau/crypto-typeorm`](../crypto-typeorm)              | ORM Adapter      | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                            |
| [`@sebastienrousseau/crypto-vue`](../crypto-vue)                      | Vue Composables  | Vue 3 composables for client-side cryptography                                                                                             |
| [`@sebastienrousseau/crypto-wasm`](../crypto-wasm)                    | Acceleration     | WebAssembly performance accelerator for crypto-lib                                                                                         |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-cli is the command-line interface for the Crypto Service
Suite. It offers both legacy OpenPGP commands (key generation,
encryption, decryption, signing, verification, revocation) and
modern v2 commands using `@noble/*` primitives with post-quantum
algorithm support. All operations run interactively via a guided
prompt menu.

<p align="right"><a href="#contents">Back to Top</a></p>
## Commands Reference

### Legacy Commands (OpenPGP)

| Command    | Description                                                    |
| :--------- | :------------------------------------------------------------- |
| `Generate` | Generate a new OpenPGP key pair (RSA or ECC)                   |
| `Encrypt`  | Encrypt a message using public keys, passwords, or both        |
| `Decrypt`  | Decrypt a message with a private key, session key, or password |
| `Sign`     | Sign a message with an OpenPGP private key                     |
| `Verify`   | Verify signatures of a cleartext signed message                |
| `Revoke`   | Revoke an OpenPGP key with a reason                            |
| `Reformat` | Reformat signature packets and rewrap a key object             |
| `Session`  | Generate a new session key object from public key preferences  |

### Modern Commands (v2)

| Command          | Description                                                 |
| :--------------- | :---------------------------------------------------------- |
| `Modern Keygen`  | Generate key pairs for 12 algorithms including post-quantum |
| `Modern Hash`    | Hash data with 7 algorithms (SHA-2, SHA-3, BLAKE)           |
| `Modern Encrypt` | Encrypt/decrypt with 5 AEAD ciphers                         |
| `Modern Sign`    | Sign and verify with 8 algorithms including ML-DSA          |
| `Password Hash`  | Hash and verify passwords with 3 Argon2 variants            |

<p align="right"><a href="#contents">Back to Top</a></p>
## Configuration

The CLI respects the following environment variables:

| Variable             | Default      | Description                               |
| :------------------- | :----------- | :---------------------------------------- |
| `CRYPTO_KEY_DIR`     | `./keys`     | Directory for reading key files           |
| `CRYPTO_DATA_DIR`    | `./data`     | Directory for reading data files          |
| `CRYPTO_KEY_OUT_DIR` | `./keys/out` | Directory for writing generated key files |

```bash
export CRYPTO_KEY_DIR="$HOME/.crypto/keys"
export CRYPTO_DATA_DIR="$HOME/.crypto/data"
export CRYPTO_KEY_OUT_DIR="$HOME/.crypto/keys/out"
cryptocli
```

<p align="right"><a href="#contents">Back to Top</a></p>
## Examples

Runnable shell scripts are provided in the [`examples/`](examples/)
directory:

| Category   | Example                             | Purpose                                   |
| :--------- | :---------------------------------- | :---------------------------------------- |
| Keygen     | [keygen.sh](examples/keygen.sh)     | Generate Ed25519, P-256, and ML-KEM keys  |
| Hashing    | [hash.sh](examples/hash.sh)         | Hash data with various algorithms         |
| Encryption | [encrypt.sh](examples/encrypt.sh)   | Encrypt and decrypt with modern ciphers   |
| Signing    | [sign.sh](examples/sign.sh)         | Sign and verify with modern algorithms    |
| Passwords  | [password.sh](examples/password.sh) | Hash and verify passwords with Argon2     |
| Legacy     | [legacy.sh](examples/legacy.sh)     | Legacy OpenPGP key generation and signing |

Run any example:

```bash
bash examples/keygen.sh
```

<p align="right"><a href="#contents">Back to Top</a></p>

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-cli run build
pnpm --filter @sebastienrousseau/crypto-cli run test
pnpm --filter @sebastienrousseau/crypto-cli run lint
pnpm --filter @sebastienrousseau/crypto-cli run format
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
