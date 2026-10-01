<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-sdk-logo.svg" alt="crypto-sdk logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-sdk</h1>

<p align="center">
  A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-sdk"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-sdk.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
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
pnpm add @sebastienrousseau/crypto-sdk
# or
npm install @sebastienrousseau/crypto-sdk
# or
yarn add @sebastienrousseau/crypto-sdk
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
import { CryptoClient } from "@sebastienrousseau/crypto-sdk";

const client = new CryptoClient({
  baseUrl: "http://localhost:3000",
  apiKey: "<the server's CRYPTO_API_KEY>",
});

const { data } = await client.hash({ algorithm: "sha256", data: "hello" });
console.log(data.digest);
```

`CryptoClient` accepts two authentication mechanisms. The server refuses
unauthenticated requests unless it runs with `ALLOW_ANONYMOUS=1`, and each
route needs a scope (`crypto:sign`, `crypto:keys`, ...); an API key holds
`crypto:admin`, which covers every scope except `crypto:keys:export`.

| Option   | Header sent                     | Description      |
| :------- | :------------------------------ | :--------------- |
| `apiKey` | `x-api-key: <value>`            | Static API key   |
| `token`  | `Authorization: Bearer <value>` | JWT bearer token |

### Server-held keys

Private keys never cross the API. Key-generation methods return a `keyId`
with the public key, and the server keeps the private key; methods that
need it take the `keyId`. A key is usable only by the principal that
generated it.

```ts
const { data: key } = await client.generateKeyPair({ algorithm: "ed25519" });
const { data: sig } = await client.sign({ keyId: key.keyId, message: "hi" });
const { data: check } = await client.verify({
  publicKey: key.publicKey,
  message: "hi",
  signature: sig.signature,
});
console.log(check.valid); // true
```

`exportKey({ keyId })` returns the private parts, and only to a principal
whose token grants `crypto:keys:export` explicitly.

### Errors

Failed requests throw a `CryptoApiError` whose `body` is the server's
[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem
(`application/problem+json`):

```ts
import { CryptoClient, CryptoApiError } from "@sebastienrousseau/crypto-sdk";

try {
  await client.sign({ keyId: "k_AAAAAAAAAAAAAAAAAAAAAA", message: "x" });
} catch (err) {
  if (err instanceof CryptoApiError) {
    console.error(err.status); // 404
    console.error(err.body.type); // "urn:crypto-service:problem:key-not-found"
    console.error(err.body.detail); // "Key not found"
    console.error(err.body.code); // "KEY_NOT_FOUND"
  }
}
```

`body` has `type`, `title`, `status`, `detail` and `instance`, plus
`code` for crypto-lib and key-store errors and `errors` (`{ field, message }`
per failed check) for validation failures. A response without a problem
body (for example from a proxy) becomes an `about:blank` problem for its
status code.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## The Crypto Service ecosystem

Crypto Service provides a complete cryptography stack across 14 specialized packages:

| Package                                                               | Role            | Description                                                                                                                            |
| :-------------------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](../crypto-api)                      | API Schemas     | Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.                                |
| [`@sebastienrousseau/crypto-cli`](../crypto-cli)                      | Terminal CLI    | An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms. |
| [`@sebastienrousseau/crypto-edge`](../crypto-edge)                    | Edge Runtime    | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.               |
| [`@sebastienrousseau/crypto-kms`](../crypto-kms)                      | Cloud KMS       | Unified Key Management Service interface for AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.                             |
| [`@sebastienrousseau/crypto-lib`](../crypto-lib)                      | Core Library    | A modern cryptographic library for TypeScript, with post-quantum support, zero unsafe dependencies, and 100% test coverage.            |
| [`@sebastienrousseau/crypto-middleware`](../crypto-middleware)        | Middleware      | Framework-agnostic cryptographic middleware for Express, Fastify, and Koa applications.                                                |
| [`@sebastienrousseau/crypto-prisma`](../crypto-prisma)                | ORM Adapter     | Transparent field-level encryption extension for Prisma Client, using XChaCha20-Poly1305.                                              |
| [`@sebastienrousseau/crypto-react`](../crypto-react)                  | React Hooks     | React hooks and context provider for client-side cryptographic operations with zero boilerplate.                                       |
| **[`@sebastienrousseau/crypto-sdk`](../crypto-sdk)** _(this package)_ | **Client SDK**  | **A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.**                              |
| [`@sebastienrousseau/crypto-server`](../crypto-server)                | HTTP API        | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.             |
| [`@sebastienrousseau/crypto-testing`](../crypto-testing)              | Test Support    | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                                       |
| [`@sebastienrousseau/crypto-typeorm`](../crypto-typeorm)              | ORM Adapter     | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                        |
| [`@sebastienrousseau/crypto-vue`](../crypto-vue)                      | Vue Composables | Vue 3 composables for client-side cryptography                                                                                         |
| [`@sebastienrousseau/crypto-wasm`](../crypto-wasm)                    | Acceleration    | WebAssembly performance accelerator for crypto-lib                                                                                     |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-sdk is a typed HTTP client that wraps the Crypto Service REST
API. It uses the global `fetch` API (no runtime dependencies) and
provides strongly-typed methods for every v2 endpoint -- hashing,
encryption, signing, key derivation, password hashing, key
management, sealed boxes, secretboxes, and post-quantum KEM and
signature operations.

<p align="right"><a href="#contents">Back to Top</a></p>

## API Reference

Methods return `Promise<ApiResponse<T>>` where `ApiResponse<T>` is
`{ data: T }`, except `getCbom()` (the CycloneDX document itself) and
`health()`. Methods marked _keyId_ use a server-held key; key-generation
methods return its `keyId` and public key, never the private key.

| Method                   | Endpoint                         | Description                                    |
| :----------------------- | :------------------------------- | :--------------------------------------------- |
| `hash(body)`             | `POST /v2/hash`                  | Compute a cryptographic hash                   |
| `encrypt(body)`          | `POST /v2/encrypt`               | Encrypt with XChaCha20-Poly1305                |
| `decrypt(body)`          | `POST /v2/decrypt`               | Decrypt ciphertext                             |
| `generateKeyPair(body?)` | `POST /v2/keys/generate`         | Generate a server-held key pair                |
| `exportKey(body)`        | `POST /v2/keys/export`           | Export a key's private parts (_keyId_)         |
| `sign(body)`             | `POST /v2/sign`                  | Sign with Ed25519 (_keyId_)                    |
| `verify(body)`           | `POST /v2/verify`                | Verify an Ed25519 signature                    |
| `kdf(body)`              | `POST /v2/kdf`                   | Derive a key                                   |
| `mac(body)`              | `POST /v2/hmac`                  | Compute an HMAC                                |
| `macVerify(body)`        | `POST /v2/hmac/verify`           | Verify an HMAC                                 |
| `passwordHash(body)`     | `POST /v2/password/hash`         | Hash a password with Argon2id                  |
| `passwordVerify(body)`   | `POST /v2/password/verify`       | Verify a password hash                         |
| `passwordEncrypt(body)`  | `POST /v2/password/encrypt`      | Encrypt data with a password                   |
| `passwordDecrypt(body)`  | `POST /v2/password/decrypt`      | Decrypt password-encrypted data                |
| `keyWrap(body)`          | `POST /v2/keys/wrap`             | Wrap a key                                     |
| `keyUnwrap(body)`        | `POST /v2/keys/unwrap`           | Unwrap a wrapped key                           |
| `secretboxSeal(body)`    | `POST /v2/secretbox/seal`        | Seal plaintext with a symmetric key            |
| `secretboxOpen(body)`    | `POST /v2/secretbox/open`        | Open a sealed secretbox                        |
| `sealedboxSeal(body)`    | `POST /v2/sealedbox/seal`        | Seal plaintext for an X25519 public key        |
| `sealedboxOpen(body)`    | `POST /v2/sealedbox/open`        | Open a sealed box (_keyId_)                    |
| `sealedboxSealPq(body)`  | `POST /v2/sealedbox/seal-pq`     | Seal plaintext for a hybrid public key pair    |
| `sealedboxOpenPq(body)`  | `POST /v2/sealedbox/open-pq`     | Open a hybrid sealed box (_keyId_)             |
| `mlKemGenerateKeyPair()` | `POST /v2/pq/keygen`             | Generate a server-held ML-KEM-768 key pair     |
| `mlKemEncapsulate(body)` | `POST /v2/pq/encapsulate`        | Encapsulate to an ML-KEM-768 public key        |
| `mlKemDecapsulate(body)` | `POST /v2/pq/decapsulate`        | Decapsulate (_keyId_)                          |
| `pqGenerateKeyPair()`    | `POST /v2/pq/hybrid/keygen`      | Generate a server-held hybrid key pair         |
| `pqEncapsulate(body)`    | `POST /v2/pq/hybrid/encapsulate` | Encapsulate a hybrid shared secret             |
| `pqDecapsulate(body)`    | `POST /v2/pq/hybrid/decapsulate` | Decapsulate a hybrid shared secret (_keyId_)   |
| `pqSignKeygen(body)`     | `POST /v2/pq/dsa/keygen`         | Generate a server-held ML-DSA key pair         |
| `pqSign(body)`           | `POST /v2/pq/dsa/sign`           | Sign with ML-DSA (_keyId_; level from the key) |
| `pqVerify(body)`         | `POST /v2/pq/dsa/verify`         | Verify an ML-DSA signature                     |
| `pqHashSignKeygen(body)` | `POST /v2/pq/slh-dsa/keygen`     | Generate a server-held SLH-DSA key pair        |
| `pqHashSign(body)`       | `POST /v2/pq/slh-dsa/sign`       | Sign with SLH-DSA (_keyId_; variant from key)  |
| `pqHashVerify(body)`     | `POST /v2/pq/slh-dsa/verify`     | Verify an SLH-DSA signature                    |
| `getDoraCompliance()`    | `GET /v2/compliance/dora`        | DORA self-assessment                           |
| `getCbom()`              | `GET /v2/compliance/cbom`        | CycloneDX 1.6 CBOM                             |
| `algorithms()`           | `GET /v2/algorithms`             | List all supported algorithms                  |
| `health()`               | `GET /health`                    | Server health check                            |

The stream (`/v2/stream/*`), multi-recipient (`/v2/multi-recipient/encrypt`)
and v1 OpenPGP routes have no SDK methods yet.

<p align="right"><a href="#contents">Back to Top</a></p>

## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Each requires the crypto-server running on
`http://localhost:3000` (override via `CRYPTO_SERVER_URL`) and sends
`CRYPTO_API_KEY` (or the JWT in `CRYPTO_TOKEN`) when set.
`pnpm run examples:check` type-checks them against the SDK.

```bash
CRYPTO_API_KEY=<key> npx ts-node examples/<name>.ts
```

| Category     | Example                                 | Purpose                                        |
| :----------- | :-------------------------------------- | :--------------------------------------------- |
| Algorithms   | [algorithms.ts](examples/algorithms.ts) | List all supported algorithms                  |
| Encryption   | [encrypt.ts](examples/encrypt.ts)       | XChaCha20-Poly1305 encrypt and decrypt         |
| Hashing      | [hash.ts](examples/hash.ts)             | Compute SHA-256, SHA-512 and BLAKE2b digests   |
| KDF          | [kdf.ts](examples/kdf.ts)               | Key derivation with HKDF-SHA256                |
| Key Gen      | [keygen.ts](examples/keygen.ts)         | Generate server-held key pairs                 |
| Key Wrap     | [keywrap.ts](examples/keywrap.ts)       | AES key wrapping and unwrapping                |
| MAC          | [mac.ts](examples/mac.ts)               | HMAC-SHA256 compute and verify                 |
| Passwords    | [password.ts](examples/password.ts)     | Argon2 hashing and password encryption         |
| PQ KEM       | [pqkem.ts](examples/pqkem.ts)           | Hybrid X25519 + ML-KEM key exchange by keyId   |
| PQ Sign      | [pqsign.ts](examples/pqsign.ts)         | ML-DSA post-quantum signing by keyId           |
| PQ Hash Sign | [pqhashsign.ts](examples/pqhashsign.ts) | SLH-DSA post-quantum signing by keyId          |
| Sealed Box   | [sealedbox.ts](examples/sealedbox.ts)   | Anonymous public-key encryption, open by keyId |
| Secretbox    | [secretbox.ts](examples/secretbox.ts)   | Symmetric authenticated encryption             |
| Signing      | [sign.ts](examples/sign.ts)             | Ed25519 signing by keyId and verification      |

`__tests__/contract.test.ts` runs the SDK against the real crypto-server
in process (its `fetch` forwards to Fastify's `inject`), so a drift
between a method and its route fails the test suite.

<p align="right"><a href="#contents">Back to Top</a></p>

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-sdk run build
pnpm --filter @sebastienrousseau/crypto-sdk run test
pnpm --filter @sebastienrousseau/crypto-sdk run lint
pnpm --filter @sebastienrousseau/crypto-sdk run format
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
