<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="assets/crypto-service-logo.svg" alt="Crypto Service logo" width="360" />
</p>

<h1 align="center">Crypto Service</h1>

<p align="center">
  A comprehensive TypeScript cryptography toolkit — 50+ algorithms, post-quantum ready, full-stack integration.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-service"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-service.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
  <a href="https://sebastienrousseau.github.io/crypto-service/"><img src="https://img.shields.io/badge/docs-TypeDoc-blue.svg?style=for-the-badge&labelColor=555555&logo=typescript" alt="Docs" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/sebastienrousseau/crypto-service" title="ossf-scorecard"><img src="https://img.shields.io/badge/OpenSSF-Scorecard-blue?style=for-the-badge&logo=openssf" alt="OpenSSF Scorecard" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg?style=for-the-badge" alt="License: Apache-2.0 OR MIT" /></a>
  <a href="https://github.com/sebastienrousseau/crypto-service/blob/main/docs/POLICIES.md"><img src="https://img.shields.io/badge/Node.js-%3E%3D22-93450a.svg?style=for-the-badge&logo=node.js" alt="Node.js 22 or newer" /></a>
</p>

---

## Contents

**Getting started**

- [Install](#install) — pnpm, npm, yarn, source, and Docker
- [Requirements](#requirements) — toolchain floor, platforms
- [Quick Start](#quick-start) — core encryption, hashing, and CLI usage

**The Crypto Service ecosystem**

- [The Crypto Service ecosystem](#the-crypto-service-ecosystem) — 14 specialized packages across library, server, SDK, CLI, and framework adapters

**Library reference**

- [Capabilities at a glance](#capabilities-at-a-glance) — the current surface by theme
- [Ecosystem comparison](#ecosystem-comparison) — short matrix; full table at [`docs/COMPARISON.md`](docs/COMPARISON.md)
- [Benchmarks](#benchmarks) — headline numbers; full table at [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md)
- [Features](#features) — module-level capability list
- [Configuration](#configuration) — core options and environment variables
- [Examples](#examples) — runnable example index

**Operational**

- [When not to use Crypto Service](#when-not-to-use-crypto-service) — limitations and operational boundaries
- [Development](#development) — pnpm tasks, coverage, gates, and CI
- [Security](#security) — guarantees and compliance
- [Documentation](#documentation) — all reference docs
- [Stability guarantees](#stability-guarantees) — SemVer axis, output stability, minimum toolchain discipline
- [License](#license)

---

## Install

### As a Node.js / TypeScript library

```bash
pnpm add @sebastienrousseau/crypto-lib
```

Crypto Service is distributed as a family of scoped npm packages. Install only what
you need, or clone the entire monorepo for full-stack development.

| Method                 | Command / Steps                                                                                                               |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| **pnpm** (recommended) | `pnpm add @sebastienrousseau/crypto-lib`                                                                                      |
| **npm**                | `npm install @sebastienrousseau/crypto-lib`                                                                                   |
| **yarn**               | `yarn add @sebastienrousseau/crypto-lib`                                                                                      |
| **From source**        | `git clone https://github.com/sebastienrousseau/crypto-service.git && cd crypto-service && pnpm install && pnpm -r run build` |
| **Docker**             | `docker run -p 3000:3000 ghcr.io/sebastienrousseau/crypto-service:latest`                                                     |

Docker container images are published to GHCR. Standalone distro packages and Repology tracking will be established once packaged by distributions.

### Individual packages

Install only the packages your application requires:

```bash
# Core cryptographic library (required for all operations)
pnpm add @sebastienrousseau/crypto-lib

# REST API server
pnpm add @sebastienrousseau/crypto-server

# TypeScript SDK client for the REST API
pnpm add @sebastienrousseau/crypto-sdk

# CLI tool (install globally)
pnpm add -g @sebastienrousseau/crypto-cli

# Framework integrations
pnpm add @sebastienrousseau/crypto-react       # React hooks
pnpm add @sebastienrousseau/crypto-vue         # Vue 3 composables
pnpm add @sebastienrousseau/crypto-middleware  # Express/Fastify middleware

# ORM adapters
pnpm add @sebastienrousseau/crypto-prisma      # Prisma field encryption
pnpm add @sebastienrousseau/crypto-typeorm     # TypeORM column encryption

# Infrastructure
pnpm add @sebastienrousseau/crypto-edge        # Edge/serverless adapter
pnpm add @sebastienrousseau/crypto-kms         # Cloud KMS integration
pnpm add @sebastienrousseau/crypto-wasm        # WebAssembly acceleration
pnpm add @sebastienrousseau/crypto-testing     # Test utilities & mock providers
```

---

## Requirements

Node.js **>= 22.0.0** (tested on Node.js 22 and 24 across macOS, Linux, and Windows).
Package manager: **pnpm >= 9.0.0** (monorepo workspaces).
TypeScript: **~5.9.3** for development.
Optional WebAssembly acceleration requires an environment supporting WebAssembly SIMD.
Docker images require Docker 20.10+ or a compatible OCI runtime.
See [toolchain policy](docs/POLICIES.md).

---

## Quick Start

```typescript
import {
  AesGcmEncryption,
  Sha256Hasher,
  MlKemKem,
  SlhDsaSignature,
} from "@sebastienrousseau/crypto-lib";

// 1. Authenticated Encryption with AES-256-GCM
const cipher = new AesGcmEncryption();
const key = cipher.generateKey();
const encrypted = cipher.encrypt("Sensitive payload", key);
const decrypted = cipher.decrypt(encrypted, key);

// 2. Cryptographic Hashing with SHA-256
const hasher = new Sha256Hasher();
const digest = hasher.hash("Integrity check");

// 3. Post-Quantum Key Encapsulation (ML-KEM / FIPS 203)
const mlkem = new MlKemKem("ml-kem-768");
const keypair = mlkem.generateKeyPair();
const { ciphertext, sharedSecret } = mlkem.encapsulate(keypair.publicKey);
const decapsulatedSecret = mlkem.decapsulate(ciphertext, keypair.privateKey);

// 4. Post-Quantum Stateless Hash-Based Signatures (SLH-DSA / FIPS 205)
const slhdsa = new SlhDsaSignature("slh-dsa-sha2-128s");
const signKeys = slhdsa.generateKeyPair();
const sig = slhdsa.sign("Message to authenticate", signKeys.privateKey);
const isValid = slhdsa.verify(
  "Message to authenticate",
  sig,
  signKeys.publicKey,
);
```

Run CLI commands directly:

```bash
crypto-cli hash --algorithm sha256 --input "Hello World"
crypto-cli encrypt --algorithm aes-256-gcm --input "Secret Data" --key <KEY>
```

---

## The Crypto Service ecosystem

All 14 packages follow a coordinated versioning policy with automated CI enforcement and lockstep releases.

| Component                                                            | Purpose                                                              | Use case                                             |
| :------------------------------------------------------------------- | :------------------------------------------------------------------- | :--------------------------------------------------- |
| [`@sebastienrousseau/crypto-lib`](packages/crypto-lib)               | Core crypto engine: classical, modern, post-quantum (50+ algorithms) | Standalone library for Node.js, browsers, and Edge   |
| [`@sebastienrousseau/crypto-server`](packages/crypto-server)         | High-performance Fastify REST API service                            | Cryptography-as-a-service microservice               |
| [`@sebastienrousseau/crypto-sdk`](packages/crypto-sdk)               | Typed TypeScript SDK client for the REST API                         | Client applications consuming the REST service       |
| [`@sebastienrousseau/crypto-cli`](packages/crypto-cli)               | Terminal CLI with JSON/human outputs & shell completions             | DevOps automation, local keygen, and file encryption |
| [`@sebastienrousseau/crypto-api`](packages/crypto-api)               | Core API schemas, routes, and OpenTelemetry instrumentation          | Shared HTTP contract and telemetry layer             |
| [`@sebastienrousseau/crypto-middleware`](packages/crypto-middleware) | Express and Fastify request encryption/decryption middleware         | Automated payload encryption in HTTP pipelines       |
| [`@sebastienrousseau/crypto-react`](packages/crypto-react)           | React hooks (`useEncryption`, `useKeypair`, etc.)                    | Web application client-side cryptography             |
| [`@sebastienrousseau/crypto-vue`](packages/crypto-vue)               | Vue 3 composables for reactive cryptography                          | Vue/Nuxt client-side encryption and hashing          |
| [`@sebastienrousseau/crypto-edge`](packages/crypto-edge)             | Cloudflare Workers, Vercel Edge, and Deno runtime adapters           | Serverless and edge cryptographic processing         |
| [`@sebastienrousseau/crypto-kms`](packages/crypto-kms)               | AWS KMS, Google Cloud KMS, and Azure Key Vault integration           | Enterprise envelope encryption and key rotation      |
| [`@sebastienrousseau/crypto-prisma`](packages/crypto-prisma)         | Prisma client extension for transparent field encryption             | Zero-knowledge database field encryption             |
| [`@sebastienrousseau/crypto-typeorm`](packages/crypto-typeorm)       | TypeORM column transformer for encrypted persistence                 | Transparent database column encryption               |
| [`@sebastienrousseau/crypto-wasm`](packages/crypto-wasm)             | WebAssembly-accelerated primitives with JS fallback                  | High-throughput hashing and cipher execution         |
| [`@sebastienrousseau/crypto-testing`](packages/crypto-testing)       | Cryptographic test utilities, known-answer tests, and mocks          | Testing downstream applications using crypto-service |

---

## Capabilities at a glance

| Area                    | Capability                                                     | Status                                        |
| :---------------------- | :------------------------------------------------------------- | :-------------------------------------------- |
| Symmetric Ciphers       | AES-GCM, AES-CBC, AES-CTR, ChaCha20-Poly1305, Camellia         | Production (FIPS-compliant & modern AEAD)     |
| Asymmetric & Signatures | RSA-OAEP/PSS, ECDSA (P-256/384/521, secp256k1), Ed25519, Ed448 | Production (PKCS#1, RFC 8032, RFC 6979)       |
| Key Exchange & KEM      | ECDH, X25519, X448, ML-KEM-512/768/1024 (FIPS 203)             | Production (Quantum-resistant & hybrid)       |
| Post-Quantum Signatures | ML-DSA-44/65/87 (FIPS 204), SLH-DSA-128/192/256 (FIPS 205)     | Production (Complete NIST FIPS suite)         |
| Hash Functions          | SHA-2, SHA-3, SHAKE, BLAKE2b/s, BLAKE3, RIPEMD-160             | Production (High performance & extensible)    |
| Key Derivation (KDF)    | HKDF, PBKDF2, Scrypt, Argon2id                                 | Production (Password hashing & key expansion) |
| Message Authentication  | HMAC, KMAC, Poly1305                                           | Production (Constant-time verification)       |
| OpenPGP & Certificates  | PGP encryption/signing, X.509 cert validation and parsing      | Production (Full OpenPGPjs integration)       |
| Zero-Knowledge Proofs   | Schnorr ZKP, commitment schemes (Pedersen)                     | Production (Interactive and non-interactive)  |
| Observability           | OpenTelemetry tracing, Prometheus metrics, structured logs     | Production (Standardized across services)     |

---

## Ecosystem comparison

This matrix compares Crypto Service's unified TypeScript architecture against alternative solutions.

| Project            |   Algorithm Coverage    |  Post-Quantum (FIPS 203/204/205)  | Full-Stack Integrations (ORM/React/Vue/CLI) |
| :----------------- | :---------------------: | :-------------------------------: | :-----------------------------------------: |
| **Crypto Service** |   **50+ algorithms**    | **Yes (ML-KEM, ML-DSA, SLH-DSA)** | **Yes (Prisma, TypeORM, React, Vue, CLI)**  |
| Web Crypto API     |  Standard web set only  |       No native PQ support        |     No (low-level browser/runtime only)     |
| Node.js `crypto`   |  Classical OpenSSL set  | Experimental / OpenSSL-dependent  |         No (standard library only)          |
| libsodium          | High-level modern suite |      No (pre-quantum focus)       |         Partial community bindings          |

See [`docs/COMPARISON.md`](docs/COMPARISON.md) for the evidence and complete matrix.

---

## Benchmarks

Benchmarked across cryptographic primitives on Node.js 22 LTS (Apple Silicon & Linux x86_64). CI smoke-runs benchmarks on every push to detect performance regressions.

| Scenario                         |       Result | Environment                             |
| :------------------------------- | -----------: | :-------------------------------------- |
| AES-256-GCM (1 MB payload)       |   1,420 MB/s | Node.js 22 LTS, Apple M-series hardware |
| ChaCha20-Poly1305 (1 MB payload) |     980 MB/s | Node.js 22 LTS, Apple M-series hardware |
| SHA-256 Hashing (1 MB payload)   |   1,850 MB/s | Node.js 22 LTS, Apple M-series hardware |
| ML-KEM-768 Encap + Decap         | 0.85 ms / op | Node.js 22 LTS, Apple M-series hardware |
| ML-DSA-65 Sign + Verify          | 1.12 ms / op | Node.js 22 LTS, Apple M-series hardware |
| SLH-DSA-128s Fast Sign + Verify  | 12.4 ms / op | Node.js 22 LTS, Apple M-series hardware |

See [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md) for methodology and full results.

---

## Features

### Unified Cryptographic API

- Consistent interface for all algorithms: encryption, hashing, signing, key generation, and key derivation.
- Built-in type definitions, strict input validation, and automatic serialization/deserialization.
- Support for classical algorithms (AES, RSA, ECC, HMAC) and modern primitives (ChaCha20-Poly1305, Ed25519, X25519).

### Post-Quantum Cryptography (FIPS 203, 204, 205)

- **ML-KEM (FIPS 203)**: Module-Lattice-Based Key-Encapsulation Mechanism across security categories (512, 768, 1024).
- **ML-DSA (FIPS 204)**: Module-Lattice-Based Digital Signature Algorithm across parameter sets (44, 65, 87).
- **SLH-DSA (FIPS 205)**: Stateless Hash-Based Digital Signature Algorithm supporting SHA-2 and SHAKE parameter sets.

### Full-Stack Architecture

- **Microservice Ready**: Preconfigured Fastify server (`@sebastienrousseau/crypto-server`) with OpenAPI/Swagger schemas.
- **Client SDK**: Fully typed SDK (`@sebastienrousseau/crypto-sdk`) with automatic retries and error mapping.
- **Command-Line Interface**: Terminal CLI (`@sebastienrousseau/crypto-cli`) supporting interactive mode, pipelines, and JSON output.
- **UI Framework Hooks**: React hooks (`@sebastienrousseau/crypto-react`) and Vue 3 composables (`@sebastienrousseau/crypto-vue`).
- **Database Field Encryption**: Transparent field-level encryption extensions for Prisma (`@sebastienrousseau/crypto-prisma`) and TypeORM (`@sebastienrousseau/crypto-typeorm`).

---

## Configuration

### Command-Line Interface (`crypto-cli`)

Use `crypto-cli --help` for current subcommands and options:

```bash
crypto-cli --help
crypto-cli encrypt --help
crypto-cli hash --help
```

### Server Configuration (`crypto-server`)

The REST API server is configured via environment variables:

| Variable                      | Description                                                            | Default                 |
| :---------------------------- | :--------------------------------------------------------------------- | :---------------------- |
| `PORT`                        | HTTP server port                                                       | `3000`                  |
| `HOST`                        | Bind host address                                                      | `0.0.0.0`               |
| `LOG_LEVEL`                   | Pino logger level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`) | `info`                  |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry OTLP collector endpoint                                  | `http://localhost:4318` |
| `API_KEY`                     | Optional bearer token authentication for endpoints                     | None                    |

---

## Examples

Runnable example code and integration patterns are located in [`examples/`](examples/):

### Middleware Integration (Express / Fastify)

```typescript
import Fastify from "fastify";
import { cryptoMiddleware } from "@sebastienrousseau/crypto-middleware";

const app = Fastify();
await app.register(cryptoMiddleware, {
  algorithm: "aes-256-gcm",
  secretKey: process.env.PAYLOAD_SECRET_KEY,
});
```

### Prisma Transparent Field Encryption

```typescript
import { PrismaClient } from "@prisma/client";
import { fieldEncryptionExtension } from "@sebastienrousseau/crypto-prisma";

const prisma = new PrismaClient().$extends(
  fieldEncryptionExtension({
    secretKey: process.env.ENCRYPTION_KEY,
    fields: {
      User: ["ssn", "dateOfBirth"],
    },
  }),
);
```

---

## When not to use Crypto Service

- **Direct Hardware Security Module (HSM) C bindings**: Environments requiring low-level C-based PKCS#11 hardware drivers without Node.js runtime layers.
- **Embedded bare-metal microcontrollers**: Devices with under 1 MB of memory running without Node.js or WebAssembly runtimes.
- **Physical FIPS 140-2 Level 4 certification**: Environments with regulatory requirements demanding physical tamper-proof hardware validation rather than software implementations.

---

## Development

```bash
pnpm install
pnpm -r run build
pnpm -r run lint
pnpm -r run format
pnpm -r run test
pnpm -r run docs
```

The test coverage floor is **100% statements, branches, functions, and lines** across all 14 packages in the workspace.
Pull requests must pass the complete CI matrix before merge. See [DEVELOPMENT.md](DEVELOPMENT.md) for local gate reproduction and [CONTRIBUTING.md](CONTRIBUTING.md) for commit and PR guidelines.

---

## Security

Report vulnerabilities privately according to [`SECURITY.md`](SECURITY.md). Never file public issues for security vulnerabilities.

All cryptographic implementations rely on audited primitives (`@noble/hashes`, `@noble/curves`, `@noble/ciphers`, `@noble/post-quantum`, Node.js native crypto, and OpenPGPjs). Memory zeroization is practiced for sensitive key materials where the JavaScript runtime permits. Constant-time operations are enforced for MAC and signature verifications. CI runs automated dependency advisory scanning, CodeQL semantic analysis, and secret detection.

Report vulnerabilities according to [`SECURITY.md`](SECURITY.md).

---

## Documentation

- [User manual & guides](docs/)
- [API reference (TypeDoc)](https://sebastienrousseau.github.io/crypto-service/)
- [Developer guide](DEVELOPMENT.md)
- [Architecture](ARCHITECTURE.md)
- [Ecosystem comparison](docs/COMPARISON.md)
- [Benchmarks](docs/BENCHMARKS.md)
- [Migration guide](MIGRATION.md)
- [Security policy](SECURITY.md)
- [Support guide](SUPPORT.md)
- [Changelog](CHANGELOG.md)

---

## Stability guarantees

Versions advance strictly one step at a time on the `0.0.x` line (`v0.0.1` → `v0.0.2` → `v0.0.3` ... → `v0.0.999` → `v0.1.0`). Work for every release iteration begins on a dedicated `feat/v<version>` branch.

All packages in the suite move in lockstep. Public API signatures, cipher output formats, and serialization schemas are strictly versioned. Breaking changes to serialized ciphertext formats, key formats, or algorithm defaults are considered major breaking changes. Minimum toolchain upgrades (e.g. Node.js LTS floor) are governed by [POLICIES.md](docs/POLICIES.md) and announced in advance.

---

## License

Dual-licensed under [Apache-2.0](LICENSE-APACHE) OR [MIT](LICENSE-MIT), at your option. See [LICENSE](LICENSE). Dependencies retain their own licenses.
