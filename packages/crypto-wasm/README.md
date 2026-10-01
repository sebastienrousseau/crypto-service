<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-wasm-logo.svg" alt="crypto-wasm logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-wasm</h1>

<p align="center">
  WebAssembly performance accelerator for crypto-lib — near-native speed for SHA-256, AES-GCM, Argon2, Ed25519, and X25519.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-wasm"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-wasm.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
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
pnpm add @sebastienrousseau/crypto-wasm
# or
npm install @sebastienrousseau/crypto-wasm
# or
yarn add @sebastienrousseau/crypto-wasm
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
  WasmAccelerator,
  isWasmSupported,
} from "@sebastienrousseau/crypto-wasm";

const accel = new WasmAccelerator();
await accel.init();

// Hash data -- uses WASM when available, JS fallback otherwise
const digest = await accel.hash("sha256", new TextEncoder().encode("hello"));
console.log(Buffer.from(digest).toString("hex"));
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## The Crypto Service ecosystem

Crypto Service provides a complete cryptography stack across 14 specialized packages:

| Package                                                                 | Role             | Description                                                                                                                            |
| :---------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](../crypto-api)                        | API Schemas      | Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.                                |
| [`@sebastienrousseau/crypto-cli`](../crypto-cli)                        | Terminal CLI     | An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms. |
| [`@sebastienrousseau/crypto-edge`](../crypto-edge)                      | Edge Runtime     | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.               |
| [`@sebastienrousseau/crypto-kms`](../crypto-kms)                        | Cloud KMS        | Unified Key Management Service interface for AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.                             |
| [`@sebastienrousseau/crypto-lib`](../crypto-lib)                        | Core Library     | A modern cryptographic library for TypeScript, with post-quantum support, zero unsafe dependencies, and 100% test coverage.            |
| [`@sebastienrousseau/crypto-middleware`](../crypto-middleware)          | Middleware       | Framework-agnostic cryptographic middleware for Express, Fastify, and Koa applications.                                                |
| [`@sebastienrousseau/crypto-prisma`](../crypto-prisma)                  | ORM Adapter      | Transparent field-level encryption extension for Prisma Client, using XChaCha20-Poly1305.                                              |
| [`@sebastienrousseau/crypto-react`](../crypto-react)                    | React Hooks      | React hooks and context provider for client-side cryptographic operations with zero boilerplate.                                       |
| [`@sebastienrousseau/crypto-sdk`](../crypto-sdk)                        | Client SDK       | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                                  |
| [`@sebastienrousseau/crypto-server`](../crypto-server)                  | HTTP API         | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.             |
| [`@sebastienrousseau/crypto-testing`](../crypto-testing)                | Test Support     | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                                       |
| [`@sebastienrousseau/crypto-typeorm`](../crypto-typeorm)                | ORM Adapter      | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                        |
| [`@sebastienrousseau/crypto-vue`](../crypto-vue)                        | Vue Composables  | Vue 3 composables for client-side cryptography                                                                                         |
| **[`@sebastienrousseau/crypto-wasm`](../crypto-wasm)** _(this package)_ | **Acceleration** | **WebAssembly performance accelerator for crypto-lib**                                                                                 |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-wasm is an optional performance accelerator for the Crypto
Service Suite. When installed alongside crypto-lib, heavy
cryptographic operations are automatically routed through a
WebAssembly module compiled from Rust, delivering near-native speed
for hashing, AES-GCM encryption, Argon2 password hashing, and
Ed25519/X25519 operations. If the WASM module is unavailable, every
operation transparently falls back to the equivalent pure-JavaScript
implementation.

<p align="right"><a href="#contents">Back to Top</a></p>

## How It Works

### Auto-Detection

When crypto-lib detects `@sebastienrousseau/crypto-wasm` as an
installed dependency, it automatically routes heavy cryptographic
operations through the WASM module. No configuration is needed.

```
crypto-lib  -->  crypto-wasm installed?
                   |               |
                  YES              NO
                   |               |
              WASM path       JS fallback
              (near-native)   (pure JS)
```

### Transparent Fallback

If the WASM module is not compiled or not available in the current
runtime, every operation falls back to the equivalent
pure-JavaScript implementation. Your application code does not need
to handle either case differently.

### Runtime Detection

```ts
import { detectCapabilities } from "@sebastienrousseau/crypto-wasm";

const caps = detectCapabilities();
// { wasmSupported: true, streamingSupported: true, simdSupported: true }
```

<p align="right"><a href="#contents">Back to Top</a></p>

## Supported Operations

| Operation       | ID                | Description                          |
| :-------------- | :---------------- | :----------------------------------- |
| SHA-256         | `hash-sha256`     | SHA-256 hash computation             |
| SHA-512         | `hash-sha512`     | SHA-512 hash computation             |
| BLAKE3          | `hash-blake3`     | BLAKE3 hash computation              |
| AES-GCM Encrypt | `aes-gcm-encrypt` | AES-256-GCM authenticated encryption |
| AES-GCM Decrypt | `aes-gcm-decrypt` | AES-256-GCM authenticated decryption |
| Argon2          | `argon2-hash`     | Argon2id/i/d password hashing        |
| Ed25519 Sign    | `ed25519-sign`    | Ed25519 signature generation         |
| Ed25519 Verify  | `ed25519-verify`  | Ed25519 signature verification       |
| X25519          | `x25519-exchange` | X25519 Diffie-Hellman key exchange   |

<p align="right"><a href="#contents">Back to Top</a></p>

## Building from Source

The WASM module is compiled from Rust. A Rust toolchain with
`wasm32-unknown-unknown` target is required.

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add the WASM target
rustup target add wasm32-unknown-unknown

# Install wasm-pack
cargo install wasm-pack

# Build the WASM module
pnpm run build:wasm
```

The compiled `.wasm` file is placed in `wasm/crypto_accel.wasm`.

<p align="right"><a href="#contents">Back to Top</a></p>

## Benchmarks

Run the built-in benchmark to compare JS and WASM performance:

```ts
import { WasmAccelerator } from "@sebastienrousseau/crypto-wasm";

const accel = new WasmAccelerator();
await accel.init();

const result = await accel.benchmark("hash-sha256", 10000);
console.log(`JS:      ${result.jsTimeMs.toFixed(2)} ms`);
console.log(`WASM:    ${result.wasmTimeMs.toFixed(2)} ms`);
console.log(`Speedup: ${result.speedup.toFixed(2)}x`);
```

**Expected speedups** (once Rust WASM module is compiled):

| Operation             | Expected Speedup |
| :-------------------- | :--------------- |
| SHA-256 (large input) | 2-5x             |
| AES-GCM               | 3-8x             |
| Argon2                | 5-15x            |
| Ed25519 Sign          | 2-4x             |
| Ed25519 Verify        | 2-4x             |
| X25519                | 2-4x             |

<p align="right"><a href="#contents">Back to Top</a></p>

## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category   | Example                                 | Purpose                                    |
| :--------- | :-------------------------------------- | :----------------------------------------- |
| Accelerate | [accelerate.ts](examples/accelerate.ts) | Basic WASM acceleration for hashing        |
| Benchmark  | [benchmark.ts](examples/benchmark.ts)   | Compare JS vs WASM performance             |
| Detect     | [detect.ts](examples/detect.ts)         | Check WASM availability and capabilities   |
| Fallback   | [fallback.ts](examples/fallback.ts)     | Graceful fallback when WASM is unavailable |

<p align="right"><a href="#contents">Back to Top</a></p>

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-wasm run build
pnpm --filter @sebastienrousseau/crypto-wasm run test
pnpm --filter @sebastienrousseau/crypto-wasm run lint
pnpm --filter @sebastienrousseau/crypto-wasm run format
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
