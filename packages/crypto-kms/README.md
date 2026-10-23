<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-kms-logo.svg" alt="crypto-kms logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-kms</h1>

<p align="center">
  Unified Key Management Service interface with AWS KMS, Google Cloud KMS, HashiCorp Vault Transit and in-memory local providers. Azure is a stub.
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

| Package                                                                                                                                   | Role            | Description                                                                                                                    |
| :---------------------------------------------------------------------------------------------------------------------------------------- | :-------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-api)                      | API docs        | Postman collection types and a Postman-to-Markdown converter; the server's API contract is its OpenAPI document.               |
| [`@sebastienrousseau/crypto-benchmarks`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-benchmarks)        | Benchmarks      | Benchmarks comparing classical and post-quantum cryptography: ops/sec, latency and throughput.                                 |
| [`@sebastienrousseau/crypto-cbom`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-cbom)                    | CBOM            | Cryptographic Bill of Materials generator and auditor (CycloneDX 1.6, SPDX 3.0).                                               |
| [`@sebastienrousseau/crypto-cli`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-cli)                      | Terminal CLI    | Command-line interface: hashing, key generation, encryption, signing, HPKE, Argon2id and CBOM scans, with an interactive menu. |
| [`@sebastienrousseau/crypto-edge`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-edge)                    | Edge Runtime    | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.       |
| **[`@sebastienrousseau/crypto-kms`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-kms)** _(this package)_ | **Cloud KMS**   | **Unified KMS interface: AWS KMS, Google Cloud KMS, Vault Transit and local providers; Azure is a stub.**                      |
| [`@sebastienrousseau/crypto-lib`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-lib)                      | Core Library    | Core library: post-quantum ML-KEM, ML-DSA and SLH-DSA, plus classical, modern and OpenPGP cryptography for TypeScript.         |
| [`@sebastienrousseau/crypto-lsp`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-lsp)                      | IDE Analysis    | Language server that flags weak and quantum-vulnerable cryptography in the editor, with quick fixes.                           |
| [`@sebastienrousseau/crypto-mcp`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-mcp)                      | AI Agents       | Model Context Protocol server exposing cryptography tools to AI assistants and agents.                                         |
| [`@sebastienrousseau/crypto-middleware`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-middleware)        | Middleware      | Cryptographic middleware for Express and Fastify: decrypt requests, encrypt responses, verify HMAC signatures and JWTs.        |
| [`@sebastienrousseau/crypto-prisma`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-prisma)                | ORM Adapter     | Transparent field-level encryption extension for Prisma Client, using XChaCha20-Poly1305.                                      |
| [`@sebastienrousseau/crypto-react`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-react)                  | React Hooks     | React hooks and context provider for client-side cryptographic operations with zero boilerplate.                               |
| [`@sebastienrousseau/crypto-sdk`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-sdk)                      | Client SDK      | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                          |
| [`@sebastienrousseau/crypto-server`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-server)                | HTTP API        | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.     |
| [`@sebastienrousseau/crypto-testing`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-testing)              | Test Support    | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                               |
| [`@sebastienrousseau/crypto-typeorm`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-typeorm)              | ORM Adapter     | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                |
| [`@sebastienrousseau/crypto-vue`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-vue)                      | Vue Composables | Vue 3 composables for client-side cryptography                                                                                 |
| [`@sebastienrousseau/crypto-wasm`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-wasm)                    | Acceleration    | Placeholder for a WebAssembly accelerator; no WebAssembly module ships yet.                                                    |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-kms defines a unified `KmsProvider` interface for key
creation, encryption, decryption, signing, verification, rotation
and data-key generation. Four providers talk to a real key store: AWS
KMS (through the AWS SDK), Google Cloud KMS and HashiCorp Vault
Transit (through their REST APIs, with `fetch`), and an in-memory
local provider. The Azure Key Vault provider is a stub: every method
rejects with `NOT_IMPLEMENTED`. The PKCS#11 provider is an in-memory
software simulation for tests (see below); it does not talk to an HSM.

`createKey` creates exactly the algorithm you ask for or rejects with
`INVALID_ARGUMENT`; it never substitutes another. Each provider accepts
the names below, and its backend's own names (such as `ML_DSA_65` on
AWS or `EC_SIGN_P384_SHA384` on Google Cloud).

<p align="right"><a href="#contents">Back to Top</a></p>

## Providers

| Provider    | Class               | Backend                    | Encryption and wrap                                        | Signing                                                                    | Dependency            |
| :---------- | :------------------ | :------------------------- | :--------------------------------------------------------- | :------------------------------------------------------------------------- | :-------------------- |
| **AWS**     | `AwsKmsProvider`    | AWS Key Management Service | `aes-256-gcm` (`SYMMETRIC_DEFAULT`), `rsa-*`               | `ed25519`, `p256`, `p384`, `p521`, `secp256k1`, `rsa-*`, `ml-dsa-44/65/87` | `@aws-sdk/client-kms` |
| **GCP**     | `GcpKmsProvider`    | Google Cloud KMS (REST v1) | `aes-256-gcm` (`GOOGLE_SYMMETRIC_ENCRYPTION`)              | `ed25519`, `p256`, `p384`, `rsa-2048/3072/4096` (PSS or PKCS#1)            | None                  |
| **Vault**   | `VaultKmsProvider`  | HashiCorp Vault Transit    | `aes-256-gcm`, `aes-128-gcm`, `chacha20-poly1305`, `rsa-*` | `ed25519`, `p256`, `p384`, `p521`, `rsa-*`                                 | None                  |
| **Local**   | `LocalKmsProvider`  | In-memory (crypto-lib)     | `aes-256-gcm`                                              | `ed25519`                                                                  | None                  |
| **Azure**   | `AzureKmsProvider`  | Azure Key Vault            | Stub: rejects `NOT_IMPLEMENTED`                            | Stub                                                                       | None                  |
| **PKCS#11** | `Pkcs11HsmProvider` | None (in-memory)           | Software simulation of `aes-256-gcm`; `simulate: true`     | Software simulation of `ed25519`                                           | None                  |

Backend behaviour worth knowing:

- **AWS**: without an explicit algorithm, `sign` and `verify` use the
  one matching the key spec (for example `ECDSA_SHA_256` for P-256,
  `ML_DSA_SHAKE_256` for ML-DSA). `rotateKey` rotates on demand, which
  AWS supports for symmetric keys only.
- **Google Cloud**: signing uses the newest enabled key version, and
  verification is done locally against the public key of each enabled
  version, since Cloud KMS has no remote asymmetric verify; signatures
  made before a rotation keep verifying until their version is
  disabled. Post-quantum signing keys are refused for now.
  `enableKey`, `disableKey` and `scheduleKeyDeletion` act on every
  version; deletion uses the key's own destroy-scheduled duration.
- **Vault**: the encryption context is bound as Transit
  `associated_data`. Ciphertext written by crypto-kms 0.0.35 or
  earlier is not bound to its context; set `acceptUnboundContext` to
  read it, then re-encrypt. Transit cannot disable a key, so
  `enableKey`/`disableKey` reject with `NOT_IMPLEMENTED`; deletion is
  immediate, so `scheduleKeyDeletion` requires `pendingWindowDays: 0`
  to confirm. Vault creates a key on the first encrypt to an unknown
  name unless the token's policy denies `create` on `transit/encrypt`;
  grant `update` only.

`Pkcs11HsmProvider` has no PKCS#11 binding: it never loads a module,
accepts any PIN, keeps keys in process memory and reports
`fipsLevel: "none (software simulation)"`. Its constructor throws
unless you pass `{ simulate: true }`. Use it only in tests.

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
| `rotateKey(keyId)`                           | Add a new current key version                |
| `destroyKeyVersion?(keyId, version)`         | Destroy a retired version (optional method)  |
| `generateDataKey(keyId, keySpec?)`           | Generate a wrapped data encryption key       |

### Key rotation and versions

`LocalKmsProvider` and `Pkcs11HsmProvider` keep every version of a key.
`rotateKey` adds a new current version; it does not replace the old
material. New ciphertext and signatures use the current version, and
each ciphertext records the version that produced it, so data encrypted
before a rotation still decrypts and signatures made before it still
verify. `getKey` reports `currentVersion`; `encrypt` and `decrypt`
report `keyVersion`.

A version stays usable until you destroy it with
`destroyKeyVersion(keyId, version)`. After that, ciphertext from that
version rejects with `VERSION_DESTROYED` and its signatures no longer
verify. The current version cannot be destroyed; rotate first.
`disableKey` and `scheduleKeyDeletion` still block every operation on
the key, all versions included.

```ts
const key = await kms.createKey("aes-256-gcm", "encrypt");
const old = await kms.encrypt(key.keyId, data); // old.keyVersion === 1
await kms.rotateKey(key.keyId); // currentVersion === 2
await kms.decrypt(key.keyId, old.ciphertext); // still decrypts with version 1
await kms.destroyKeyVersion(key.keyId, 1); // version 1 is gone for good
```

The ciphertext of these two providers is the base64 of: a format byte
(`0x01`), the key version (4 bytes, big-endian), the AES-GCM IV (12
bytes), the tag (16 bytes) and the AES-256-GCM ciphertext. Ciphertext
produced by 0.0.6 and earlier is not accepted; neither provider persists
keys, so none can outlive the process that made it.

### Encryption context

The encryption context is bound to the ciphertext as AES-GCM additional
authenticated data. It is canonicalised first (entries sorted by key),
so `{ a: "1", b: "2" }` and `{ b: "2", a: "1" }` are the same context.
Values must be strings; anything else rejects with `INVALID_ARGUMENT`.
An empty context is the same as no context.

### Errors

Providers reject with `KmsError`, which extends `Error` and carries a
`code` (and the `keyId` when there is one). Branch on the code, not the
message:

| Code                 | Meaning                                                        |
| :------------------- | :------------------------------------------------------------- |
| `NOT_FOUND`          | Unknown key, or a ciphertext names a version the key never had |
| `DISABLED`           | The key is disabled or scheduled for deletion                  |
| `INVALID_USAGE`      | The key's usage does not allow the operation                   |
| `INVALID_ARGUMENT`   | Malformed argument, or destroying the current version          |
| `INVALID_CIPHERTEXT` | Truncated ciphertext or an unknown format                      |
| `DECRYPTION_FAILED`  | Wrong context, wrong key, or tampered ciphertext               |
| `VERSION_DESTROYED`  | The ciphertext's key version has been destroyed                |
| `NOT_IMPLEMENTED`    | Stub provider (Azure), or an operation the backend lacks       |
| `DEPENDENCY_MISSING` | The AWS SDK peer dependency is not installed                   |

Errors raised by the AWS SDK itself are passed through unchanged. No
provider method takes a timeout or an `AbortSignal` yet.

<p align="right"><a href="#contents">Back to Top</a></p>

## Authentication

| Provider  | Credentials                                                                        |
| :-------- | :--------------------------------------------------------------------------------- |
| **AWS**   | Pass `credentials` in `AwsKmsOptions`, or rely on the default AWS credential chain |
| **GCP**   | An OAuth2 access token in `token`; the provider does not refresh it                |
| **Azure** | Not applicable (stub provider)                                                     |
| **Vault** | A Vault token in `token`, and `namespace` for Vault Enterprise namespaces          |
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
| Rotation | [rotation.ts](examples/rotation.ts) | Rotate, decrypt old data, destroy a retired version      |
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

All 18 packages in the Crypto Service workspace maintain a **100% coverage floor** across statements, branches, functions, and lines.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories) or according to [`SECURITY.md`](../../SECURITY.md). Never report security issues publicly.

The local and simulated PKCS#11 providers run AES-256-GCM through Node.js `crypto` and Ed25519 through crypto-lib (`@noble/curves`). Neither is a validated cryptographic module, and neither zeroes key material held in memory.

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
