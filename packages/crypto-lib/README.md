<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-lib-logo.svg" alt="crypto-lib logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-lib</h1>

<p align="center">
  A modern cryptographic library for TypeScript, with post-quantum support, zero unsafe dependencies, and 100% test coverage.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-lib"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-lib.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
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
pnpm add @sebastienrousseau/crypto-lib
# or
npm install @sebastienrousseau/crypto-lib
# or
yarn add @sebastienrousseau/crypto-lib
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
import { crypto } from "@sebastienrousseau/crypto-lib";

// Generate a random 256-bit key
const key = crypto.randomKey();

// Encrypt (XChaCha20-Poly1305 via secretbox)
const ciphertext = crypto.encrypt(key, "classified payload");

// Decrypt
const plaintext = crypto.decrypt(key, ciphertext);
console.log(Buffer.from(plaintext).toString("utf8"));
// => "classified payload"

// Hash
const digest = crypto.hash("sha3-256", "hello world");

// Sign and verify (Ed25519)
const kp = crypto.generateKeyPair("ed25519");
const sig = crypto.sign("ed25519", kp.privateKey, "message");
const ok = crypto.verify("ed25519", kp.publicKey, "message", sig);
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## The Crypto Service ecosystem

Crypto Service provides a complete cryptography stack across 14 specialized packages:

| Package                                                               | Role             | Description                                                                                                                            |
| :-------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](../crypto-api)                      | API Schemas      | Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.                                |
| [`@sebastienrousseau/crypto-cli`](../crypto-cli)                      | Terminal CLI     | An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms. |
| [`@sebastienrousseau/crypto-edge`](../crypto-edge)                    | Edge Runtime     | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.               |
| [`@sebastienrousseau/crypto-kms`](../crypto-kms)                      | Cloud KMS        | Unified Key Management Service interface for AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.                             |
| **[`@sebastienrousseau/crypto-lib`](../crypto-lib)** _(this package)_ | **Core Library** | **A modern cryptographic library for TypeScript, with post-quantum support, zero unsafe dependencies, and 100% test coverage.**        |
| [`@sebastienrousseau/crypto-middleware`](../crypto-middleware)        | Middleware       | Framework-agnostic cryptographic middleware for Express, Fastify, and Koa applications.                                                |
| [`@sebastienrousseau/crypto-prisma`](../crypto-prisma)                | ORM Adapter      | Transparent field-level encryption extension for Prisma Client, powered by AES-256-GCM.                                                |
| [`@sebastienrousseau/crypto-react`](../crypto-react)                  | React Hooks      | React hooks and context provider for client-side cryptographic operations with zero boilerplate.                                       |
| [`@sebastienrousseau/crypto-sdk`](../crypto-sdk)                      | Client SDK       | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                                  |
| [`@sebastienrousseau/crypto-server`](../crypto-server)                | HTTP API         | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.             |
| [`@sebastienrousseau/crypto-testing`](../crypto-testing)              | Test Support     | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                                       |
| [`@sebastienrousseau/crypto-typeorm`](../crypto-typeorm)              | ORM Adapter      | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                        |
| [`@sebastienrousseau/crypto-vue`](../crypto-vue)                      | Vue Composables  | Vue 3 composables for client-side cryptography                                                                                         |
| [`@sebastienrousseau/crypto-wasm`](../crypto-wasm)                    | Acceleration     | WebAssembly performance accelerator for crypto-lib                                                                                     |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-lib is the core cryptographic engine of the Crypto Service
Suite. It provides a unified TypeScript API over the audited
`@noble/hashes`, `@noble/curves`, `@noble/ciphers`, and
`@noble/post-quantum` libraries -- pure TypeScript, zero native
add-ons, no C bindings. Post-quantum primitives (ML-KEM, ML-DSA,
SLH-DSA) are first-class citizens, not add-ons, and hybrid
constructions combine classical and PQ algorithms so security holds
even if one family breaks.

Two API layers serve different needs: a unified `crypto.*` namespace
for common tasks, and granular per-module imports for full control
and tree-shaking. Both layers use the same underlying noble
primitives; the unified API is a thin dispatcher that adds no
overhead.

<p align="right"><a href="#contents">Back to Top</a></p>
## Features

| Module                        | Adds                                             |
| :---------------------------- | :----------------------------------------------- |
| `modern/hash`                 | SHA-2, SHA-3, BLAKE2b, BLAKE3                    |
| `modern/aead`                 | XChaCha20-Poly1305 encrypt/decrypt               |
| `modern/aes`                  | AES-GCM, AES-GCM-SIV (128/256)                   |
| `modern/signing`              | Ed25519 key generation, sign, verify             |
| `modern/curves`               | P-256, P-384, Ed448, X448, Schnorr (BIP-340)     |
| `modern/mac`                  | HMAC (SHA-2, SHA-3), KMAC-128/256                |
| `modern/kdf`                  | scrypt, HKDF-SHA256, PBKDF2-SHA256               |
| `modern/password`             | Argon2id/i/d hash, verify, PHC format            |
| `modern/pq-kem`               | ML-KEM-512/768/1024, hybrid KEMs                 |
| `modern/pq-sign`              | ML-DSA-44/65/87, hybrid signatures               |
| `modern/pq-hash-sign`         | SLH-DSA (FIPS 205)                               |
| `high-level/secretbox`        | Symmetric seal/open                              |
| `high-level/sealedbox`        | Anonymous public-key encryption                  |
| `high-level/password-encrypt` | Password-based encryption                        |
| `high-level/key-wrap`         | AES-KW, AES-KWP, X25519-AES-KW                   |
| `high-level/multi-recipient`  | Multi-recipient encryption                       |
| `keys/keygen`                 | Unified key generation (12 algorithms)           |
| `keys/serialize`              | Hex, Base64, PEM, JWK, thumbprints               |
| `keys/keyring`                | In-memory keyring with rotation and JWKS         |
| `streaming/stream-hash`       | Incremental hashing for large inputs             |
| `streaming/stream-aead`       | Streaming AEAD encryption                        |
| `protocols/pqxdh`             | Post-Quantum Extended Triple DH                  |
| `protocols/ratchet`           | Double Ratchet (Signal-style)                    |
| `protocols/pake`              | OPAQUE-like PAKE                                 |
| `protocols/threshold`         | Shamir SSS + Feldman VSS                         |
| `registry`                    | Algorithm metadata, deprecation, recommendations |
| `crypto`                      | Unified API namespace                            |
| `utils`                       | `timingSafeEqual`, `SecureBuffer`                |

<p align="right"><a href="#contents">Back to Top</a></p>
## Library Usage

<details>
<summary><b>Hashing</b></summary>

```ts
import { hash } from "@sebastienrousseau/crypto-lib";

const r = hash({ algorithm: "sha3-256", data: "hello" });
console.log(r.digest); // hex string
```

</details>

<details>
<summary><b>Signing</b></summary>

```ts
import { crypto } from "@sebastienrousseau/crypto-lib";

const kp = crypto.generateKeyPair("ed25519");
const sig = crypto.sign("ed25519", kp.privateKey, "payload");
const ok = crypto.verify("ed25519", kp.publicKey, "payload", sig);
```

</details>

<details>
<summary><b>Symmetric Encryption</b></summary>

```ts
import { aeadEncrypt, aeadDecrypt } from "@sebastienrousseau/crypto-lib";

const key = "a".repeat(64); // 32-byte hex key
const { ciphertext } = aeadEncrypt({ key, plaintext: "secret" });
const plain = aeadDecrypt({ key, ciphertext });
```

</details>

<details>
<summary><b>Post-Quantum KEM</b></summary>

```ts
import {
  mlKemKeygen,
  mlKemEncapsulate,
  mlKemDecapsulate,
} from "@sebastienrousseau/crypto-lib";

const kp = mlKemKeygen(768);
const { ciphertext, sharedSecret: ss1 } = mlKemEncapsulate(768, kp.publicKey);
const { sharedSecret: ss2 } = mlKemDecapsulate(768, kp.secretKey, ciphertext);
// ss1 === ss2
```

</details>

<details>
<summary><b>Password Hashing</b></summary>

```ts
import { hashPassword, verifyPasswordPhc } from "@sebastienrousseau/crypto-lib";

const result = hashPassword({ password: "hunter2" });
console.log(result.phc); // $argon2id$v=19$m=65536,t=3,p=4$...
const { valid } = verifyPasswordPhc({ password: "hunter2", phc: result.phc });
```

</details>

<details>
<summary><b>Keyring</b></summary>

```ts
import { Keyring } from "@sebastienrousseau/crypto-lib";

const ring = new Keyring();
const key = ring.add("ed25519", { use: "sig" });
const rotated = ring.rotate(key.kid);
const jwks = ring.toJwks();
```

</details>

<p align="right"><a href="#contents">Back to Top</a></p>
## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category       | Example                               | Purpose                                   |
| :------------- | :------------------------------------ | :---------------------------------------- |
| Hashing        | [hash.ts](examples/hash.ts)           | SHA-256, SHA-3, BLAKE3                    |
| Encryption     | [encrypt.ts](examples/encrypt.ts)     | XChaCha20-Poly1305 encrypt/decrypt        |
| Signing        | [sign.ts](examples/sign.ts)           | Ed25519 sign and verify                   |
| Key Generation | [keygen.ts](examples/keygen.ts)       | Generate key pairs for various algorithms |
| Passwords      | [password.ts](examples/password.ts)   | Argon2id hash and verify                  |
| Secretbox      | [secretbox.ts](examples/secretbox.ts) | Symmetric authenticated encryption        |
| Sealed Box     | [sealedbox.ts](examples/sealedbox.ts) | Anonymous public-key encryption           |
| Keyring        | [keyring.ts](examples/keyring.ts)     | Create, rotate, and export keys           |
| Threshold      | [threshold.ts](examples/threshold.ts) | Shamir secret sharing split/combine       |
| PQ KEM         | [pqkem.ts](examples/pqkem.ts)         | ML-KEM-768 key encapsulation              |
| PQ Sign        | [pqsign.ts](examples/pqsign.ts)       | ML-DSA-65 sign and verify                 |
| HMAC           | [hmac.ts](examples/hmac.ts)           | HMAC-SHA256 compute and verify            |
| KDF            | [kdf.ts](examples/kdf.ts)             | Key derivation with scrypt and HKDF       |
| Streaming      | [stream.ts](examples/stream.ts)       | Incremental hashing with createHasher     |
| Curves         | [curves.ts](examples/curves.ts)       | P-256, P-384, Ed448, Schnorr              |
| Serialization  | [serialize.ts](examples/serialize.ts) | PEM encode/decode, JWK conversion         |
| Hybrid KEM     | [hybrid.ts](examples/hybrid.ts)       | Hybrid post-quantum key exchange          |
| Registry       | [registry.ts](examples/registry.ts)   | Query algorithm registry                  |
| Unified API    | [unified.ts](examples/unified.ts)     | Unified crypto API overview               |
| Ratchet        | [ratchet.ts](examples/ratchet.ts)     | Double Ratchet protocol demo              |

<p align="right"><a href="#contents">Back to Top</a></p>

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-lib run build
pnpm --filter @sebastienrousseau/crypto-lib run test
pnpm --filter @sebastienrousseau/crypto-lib run lint
pnpm --filter @sebastienrousseau/crypto-lib run format
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
