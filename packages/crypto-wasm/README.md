<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-wasm-logo.svg" alt="crypto-wasm logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-wasm</h1>

<p align="center">
  Placeholder for a WebAssembly accelerator for crypto-lib: runtime detection and a loader for a caller-supplied module. No WebAssembly module ships yet; every operation runs in JavaScript.
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

- [The Crypto Service ecosystem](#the-crypto-service-ecosystem) — full 18-package suite overview

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

| Package                                                                                                                                     | Role             | Description                                                                                                                    |
| :------------------------------------------------------------------------------------------------------------------------------------------ | :--------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-api)                        | API docs         | Postman collection types and a Postman-to-Markdown converter; the server's API contract is its OpenAPI document.               |
| [`@sebastienrousseau/crypto-benchmarks`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-benchmarks)          | Benchmarks       | Benchmarks comparing classical and post-quantum cryptography: ops/sec, latency and throughput.                                 |
| [`@sebastienrousseau/crypto-cbom`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-cbom)                      | CBOM             | Cryptographic Bill of Materials generator and auditor (CycloneDX 1.6, SPDX 3.0).                                               |
| [`@sebastienrousseau/crypto-cli`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-cli)                        | Terminal CLI     | Command-line interface: hashing, key generation, encryption, signing, HPKE, Argon2id and CBOM scans, with an interactive menu. |
| [`@sebastienrousseau/crypto-edge`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-edge)                      | Edge Runtime     | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.       |
| [`@sebastienrousseau/crypto-kms`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-kms)                        | Cloud KMS        | Unified KMS interface: AWS KMS, Google Cloud KMS, Vault Transit and local providers; Azure is a stub.                          |
| [`@sebastienrousseau/crypto-lib`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-lib)                        | Core Library     | Core library: post-quantum ML-KEM, ML-DSA and SLH-DSA, plus classical, modern and OpenPGP cryptography for TypeScript.         |
| [`@sebastienrousseau/crypto-lsp`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-lsp)                        | IDE Analysis     | Language server that flags weak and quantum-vulnerable cryptography in the editor, with quick fixes.                           |
| [`@sebastienrousseau/crypto-mcp`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-mcp)                        | AI Agents        | Model Context Protocol server exposing cryptography tools to AI assistants and agents.                                         |
| [`@sebastienrousseau/crypto-middleware`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-middleware)          | Middleware       | Cryptographic middleware for Express and Fastify: decrypt requests, encrypt responses, verify HMAC signatures and JWTs.        |
| [`@sebastienrousseau/crypto-prisma`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-prisma)                  | ORM Adapter      | Transparent field-level encryption extension for Prisma Client, using XChaCha20-Poly1305.                                      |
| [`@sebastienrousseau/crypto-react`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-react)                    | React Hooks      | React hooks and context provider for client-side cryptographic operations with zero boilerplate.                               |
| [`@sebastienrousseau/crypto-sdk`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-sdk)                        | Client SDK       | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                          |
| [`@sebastienrousseau/crypto-server`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-server)                  | HTTP API         | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.     |
| [`@sebastienrousseau/crypto-testing`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-testing)                | Test Support     | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                               |
| [`@sebastienrousseau/crypto-typeorm`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-typeorm)                | ORM Adapter      | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                |
| [`@sebastienrousseau/crypto-vue`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-vue)                        | Vue Composables  | Vue 3 composables for client-side cryptography                                                                                 |
| **[`@sebastienrousseau/crypto-wasm`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-wasm)** _(this package)_ | **Acceleration** | **Placeholder for a WebAssembly accelerator; no WebAssembly module ships yet.**                                                |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-wasm is a placeholder. It ships WebAssembly runtime detection
and a `WasmAccelerator` class that can load a `.wasm` module you
supply, but the package contains no WebAssembly module, and no Rust
or other source for one exists in this repository. crypto-lib does
not use it. Without a module, every method runs the JavaScript
implementation, so there is no speed-up today.

<p align="right"><a href="#contents">Back to Top</a></p>

## How It Works

### Loading a module

`init()` with no argument looks for `wasm/crypto_accel.wasm` inside
the package, which is not shipped. `init(source)` instantiates a
module from a `BufferSource` or a `Response`. A failed load is not an
error: `isAvailable` stays `false` and the JavaScript path is used.

### JavaScript fallback

While no module is loaded, `hash()` uses Node.js `crypto`, and the
ML-KEM-768 and ML-DSA-65 methods call crypto-lib. When a module is
loaded, each method calls the matching export and throws if the
module does not provide it.

### Runtime Detection

```ts
import { detectCapabilities } from "@sebastienrousseau/crypto-wasm";

const caps = detectCapabilities();
// { wasmSupported: true, streamingSupported: true, simdSupported: true }
```

<p align="right"><a href="#contents">Back to Top</a></p>

## Supported Operations

| Method                                  | Fallback without a module | Export expected from a module               |
| :-------------------------------------- | :------------------------ | :------------------------------------------ |
| `hash(algorithm, data)`                 | Node.js `crypto`          | `hash_<algorithm>`                          |
| `mlKemEncapsulate` / `mlKemDecapsulate` | crypto-lib ML-KEM-768     | `ml_kem_encapsulate` / `ml_kem_decapsulate` |
| `mlDsaSign` / `mlDsaVerify`             | crypto-lib ML-DSA-65      | `ml_dsa_sign` / `ml_dsa_verify`             |

<p align="right"><a href="#contents">Back to Top</a></p>

## Benchmarks

`benchmark()` times SHA-256 hashing of a 1 KiB buffer through Node.js
`crypto` and through `hash()`. Without a module both paths are
JavaScript, so it measures no acceleration. No benchmark results are
published.

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
