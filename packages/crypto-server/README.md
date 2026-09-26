<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-server-logo.svg" alt="crypto-server logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-server</h1>

<p align="center">
  A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-server"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-server.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
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
pnpm add @sebastienrousseau/crypto-server
# or
npm install @sebastienrousseau/crypto-server
# or
yarn add @sebastienrousseau/crypto-server
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

Start the server:

```bash
npx crypto-server
# or, from a clone of this repo:
pnpm --filter @sebastienrousseau/crypto-server start
```

Hash some data:

```bash
curl -s -X POST http://localhost:3000/v2/hash \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key" \
  -d '{"algorithm":"sha256","data":"Hello, world!"}' | jq
```

```json
{
  "data": "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3"
}
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
| [`@sebastienrousseau/crypto-prisma`](../crypto-prisma)                      | ORM Adapter     | Transparent field-level encryption extension for Prisma Client, powered by AES-256-GCM.                                                |
| [`@sebastienrousseau/crypto-react`](../crypto-react)                        | React Hooks     | React hooks and context provider for client-side cryptographic operations with zero boilerplate.                                       |
| [`@sebastienrousseau/crypto-sdk`](../crypto-sdk)                            | Client SDK      | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                                  |
| **[`@sebastienrousseau/crypto-server`](../crypto-server)** _(this package)_ | **HTTP API**    | **A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.**         |
| [`@sebastienrousseau/crypto-testing`](../crypto-testing)                    | Test Support    | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                                       |
| [`@sebastienrousseau/crypto-typeorm`](../crypto-typeorm)                    | ORM Adapter     | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                        |
| [`@sebastienrousseau/crypto-vue`](../crypto-vue)                            | Vue Composables | Vue 3 composables for client-side cryptography                                                                                         |
| [`@sebastienrousseau/crypto-wasm`](../crypto-wasm)                          | Acceleration    | WebAssembly performance accelerator for crypto-lib                                                                                     |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

Crypto Server is built on **Fastify 4.x** with a layered middleware
stack:

```
Request
  -> @fastify/helmet (security headers)
  -> @fastify/cors
  -> @fastify/rate-limit
  -> @fastify/compress
  -> Authentication (x-api-key / JWT Bearer)
  -> Route handler
  -> Response
```

### Route versioning

| Prefix                        | Status         | Notes                                                                         |
| :---------------------------- | :------------- | :---------------------------------------------------------------------------- |
| `/v1/*`                       | **Deprecated** | Legacy PGP-based endpoints. Emit `Deprecation`, `Sunset`, and `Link` headers. |
| `/v2/*`                       | **Current**    | Modern endpoints using `@noble/*` primitives and post-quantum algorithms.     |
| `/live`, `/ready`, `/metrics` | Stable         | Infrastructure probes (no auth required).                                     |

<p align="right"><a href="#contents">Back to Top</a></p>
## API Routes

All v2 endpoints accept and return `application/json`. Authenticated
requests must include an `x-api-key` header (or
`Authorization: Bearer <jwt>`).

| Method | Path                          | Description                                                  |
| :----- | :---------------------------- | :----------------------------------------------------------- |
| `POST` | `/v2/hash`                    | Compute a cryptographic hash (SHA-2, SHA-3, BLAKE2b, BLAKE3) |
| `POST` | `/v2/encrypt`                 | AEAD encryption with XChaCha20-Poly1305                      |
| `POST` | `/v2/decrypt`                 | AEAD decryption with XChaCha20-Poly1305                      |
| `POST` | `/v2/sign`                    | Create a digital signature                                   |
| `POST` | `/v2/verify`                  | Verify a digital signature                                   |
| `POST` | `/v2/kdf`                     | Derive a key (scrypt, HKDF-SHA256, PBKDF2-SHA256)            |
| `POST` | `/v2/hmac`                    | Compute an HMAC                                              |
| `POST` | `/v2/hmac/verify`             | Verify an HMAC in constant time                              |
| `POST` | `/v2/password/hash`           | Hash a password with Argon2id                                |
| `POST` | `/v2/password/verify`         | Verify a password against an Argon2id hash                   |
| `POST` | `/v2/password/encrypt`        | Encrypt with password (Argon2id + XChaCha20-Poly1305)        |
| `POST` | `/v2/password/decrypt`        | Decrypt with password                                        |
| `POST` | `/v2/keys/generate`           | Generate a key pair for any supported algorithm              |
| `POST` | `/v2/keys/wrap`               | Wrap a key with AES-KW or AES-KWP                            |
| `POST` | `/v2/keys/unwrap`             | Unwrap a key                                                 |
| `POST` | `/v2/secretbox/seal`          | Encrypt with XChaCha20-Poly1305 (secretbox)                  |
| `POST` | `/v2/secretbox/open`          | Decrypt a secretbox ciphertext                               |
| `POST` | `/v2/sealedbox/seal`          | Anonymous public-key encryption (X25519)                     |
| `POST` | `/v2/sealedbox/open`          | Decrypt an anonymous sealed box                              |
| `POST` | `/v2/sealedbox/seal-pq`       | Post-quantum sealed box (X25519 + ML-KEM-768)                |
| `POST` | `/v2/sealedbox/open-pq`       | Decrypt a post-quantum sealed box                            |
| `POST` | `/v2/multi-recipient/encrypt` | Encrypt for multiple recipients                              |
| `POST` | `/v2/pq/keygen`               | Generate an ML-KEM-768 key pair (FIPS 203)                   |
| `POST` | `/v2/pq/encapsulate`          | Encapsulate a shared secret with ML-KEM-768                  |
| `POST` | `/v2/pq/decapsulate`          | Decapsulate and recover the shared secret                    |
| `POST` | `/v2/pq/hybrid/keygen`        | Generate a hybrid X25519 + ML-KEM-768 key pair               |
| `POST` | `/v2/pq/hybrid/encapsulate`   | Hybrid encapsulation                                         |
| `POST` | `/v2/pq/hybrid/decapsulate`   | Hybrid decapsulation                                         |
| `POST` | `/v2/pq/dsa/keygen`           | Generate an ML-DSA key pair (FIPS 204)                       |
| `POST` | `/v2/pq/dsa/sign`             | Sign with ML-DSA                                             |
| `POST` | `/v2/pq/dsa/verify`           | Verify an ML-DSA signature                                   |
| `POST` | `/v2/pq/slh-dsa/keygen`       | Generate an SLH-DSA key pair (FIPS 205)                      |
| `POST` | `/v2/pq/slh-dsa/sign`         | Sign with SLH-DSA                                            |
| `POST` | `/v2/pq/slh-dsa/verify`       | Verify an SLH-DSA signature                                  |
| `GET`  | `/v2/algorithms`              | List all supported algorithms                                |
| `GET`  | `/live`                       | Liveness probe (Kubernetes)                                  |
| `GET`  | `/ready`                      | Readiness probe (Kubernetes)                                 |
| `GET`  | `/metrics`                    | Prometheus-compatible metrics                                |

<p align="right"><a href="#contents">Back to Top</a></p>
## Authentication

The server supports two authentication modes:

1. **API Key** -- set `CRYPTO_API_KEY` and pass it as the `x-api-key`
   header.
2. **JWT Bearer** -- set `JWT_SECRET` and pass
   `Authorization: Bearer <token>`.

If neither variable is set, all requests are allowed (development
mode).

```bash
# API key
curl -H "x-api-key: your-secret-api-key" ...

# JWT Bearer
curl -H "Authorization: Bearer eyJhbGciOi..." ...
```

<p align="right"><a href="#contents">Back to Top</a></p>
## Configuration

| Variable              | Default       | Description                                        |
| :-------------------- | :------------ | :------------------------------------------------- |
| `PORT`                | `3000`        | TCP port to listen on                              |
| `HOST`                | `localhost`   | Bind address                                       |
| `PROTOCOL`            | `http`        | `http` or `https`                                  |
| `NODE_ENV`            | `development` | `development`, `production`, or `test`             |
| `LOG_LEVEL`           | `info`        | `error`, `warn`, `info`, or `debug`                |
| `CRYPTO_API_KEY`      | --            | Static API key for `x-api-key` authentication      |
| `JWT_SECRET`          | --            | HMAC secret for HS256 JWT validation               |
| `CORS_ORIGIN`         | --            | Comma-separated allowed origins (empty = disabled) |
| `TRUSTED_PROXY_CIDRS` | --            | Comma-separated trusted proxy CIDRs                |
| `CRYPTO_KEY_DIR`      | --            | Directory for key storage                          |
| `CRYPTO_KEY_OUT_DIR`  | --            | Directory for key output                           |
| `SHUTDOWN_TIMEOUT_MS` | `30000`       | Graceful shutdown timeout in milliseconds          |

<p align="right"><a href="#contents">Back to Top</a></p>
## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Each uses `fetch` to call the server. Run any example
with:

```bash
# Start the server in one terminal:
pnpm --filter @sebastienrousseau/crypto-server start

# Run an example in another:
npx ts-node examples/<name>.ts
```

| Category        | Example                                         | Purpose                                  |
| :-------------- | :---------------------------------------------- | :--------------------------------------- |
| Algorithms      | [algorithms.ts](examples/algorithms.ts)         | List supported algorithms                |
| Encryption      | [encrypt.ts](examples/encrypt.ts)               | Encrypt and decrypt via v2 endpoints     |
| Hashing         | [hash.ts](examples/hash.ts)                     | Hash data via POST /v2/hash              |
| HMAC            | [hmac.ts](examples/hmac.ts)                     | HMAC compute and verify                  |
| KDF             | [kdf.ts](examples/kdf.ts)                       | Key derivation                           |
| Key Generation  | [keygen.ts](examples/keygen.ts)                 | Generate keys via POST /v2/keys/generate |
| Key Wrap        | [keywrap.ts](examples/keywrap.ts)               | AES key wrapping and unwrapping          |
| Passwords       | [password.ts](examples/password.ts)             | Password hash and verify                 |
| PW Encrypt      | [pwencrypt.ts](examples/pwencrypt.ts)           | Password-based encryption and decryption |
| PQ KEM          | [pqkem.ts](examples/pqkem.ts)                   | Post-quantum KEM operations              |
| PQ Sign         | [pqsign.ts](examples/pqsign.ts)                 | Post-quantum ML-DSA signing              |
| PQ Hash Sign    | [pqhashsign.ts](examples/pqhashsign.ts)         | Post-quantum SLH-DSA signing             |
| Probes          | [probes.ts](examples/probes.ts)                 | Health and readiness checks              |
| Multi-Recipient | [multirecipient.ts](examples/multirecipient.ts) | Multi-recipient encryption               |
| Sealed Box      | [sealedbox.ts](examples/sealedbox.ts)           | Sealed box operations                    |
| Secretbox       | [secretbox.ts](examples/secretbox.ts)           | Secretbox seal and open                  |
| Signing         | [sign.ts](examples/sign.ts)                     | Sign and verify via v2 endpoints         |

<p align="right"><a href="#contents">Back to Top</a></p>

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-server run build
pnpm --filter @sebastienrousseau/crypto-server run test
pnpm --filter @sebastienrousseau/crypto-server run lint
pnpm --filter @sebastienrousseau/crypto-server run format
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
