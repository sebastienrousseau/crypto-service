<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-react-logo.svg" alt="crypto-react logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-react</h1>

<p align="center">
  React hooks and context provider for client-side cryptographic operations with zero boilerplate.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-react"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-react.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
  <a href="https://sebastienrousseau.github.io/crypto-service/"><img src="https://img.shields.io/badge/docs-TypeDoc-blue.svg?style=for-the-badge&labelColor=555555&logo=typescript" alt="Docs" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/sebastienrousseau/crypto-service" title="ossf-scorecard"><img src="https://img.shields.io/badge/OpenSSF-Scorecard-blue?style=for-the-badge&logo=openssf" alt="OpenSSF Scorecard" /></a>
  <a href="https://github.com/sebastienrousseau/crypto-service/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg?style=for-the-badge" alt="License: Apache-2.0 OR MIT" /></a>
  <a href="https://github.com/sebastienrousseau/crypto-service/blob/main/docs/POLICIES.md"><img src="https://img.shields.io/badge/Node.js-%3E%3D22-93450a.svg?style=for-the-badge&logo=node.js" alt="Node.js 22 or newer" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/react-%3E%3D18-61dafb.svg?style=for-the-badge&logo=react" alt="React >= 18" /></a>
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
pnpm add @sebastienrousseau/crypto-react
# or
npm install @sebastienrousseau/crypto-react
# or
yarn add @sebastienrousseau/crypto-react
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

```tsx
import {
  CryptoProvider,
  useKeypair,
  useEncrypt,
  useHash,
  useSignature,
} from "@sebastienrousseau/crypto-react";

function App() {
  return (
    <CryptoProvider defaultKey="deadbeef...64-hex-chars">
      <MyComponent />
    </CryptoProvider>
  );
}

function MyComponent() {
  const { generate, publicKey } = useKeypair("ed25519");
  const { encrypt, decrypt } = useEncrypt();
  const { hash, digest } = useHash("sha3-256");
  const { sign, verify } = useSignature();

  return (
    <div>
      <button onClick={() => generate()}>Generate Ed25519 Key Pair</button>
      {publicKey && <code>{publicKey}</code>}
    </div>
  );
}
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## The Crypto Service ecosystem

Crypto Service provides a complete cryptography stack across 14 specialized packages:

| Package                                                                   | Role            | Description                                                                                                                            |
| :------------------------------------------------------------------------ | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](../crypto-api)                          | API Schemas     | Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.                                |
| [`@sebastienrousseau/crypto-cli`](../crypto-cli)                          | Terminal CLI    | An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms. |
| [`@sebastienrousseau/crypto-edge`](../crypto-edge)                        | Edge Runtime    | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.               |
| [`@sebastienrousseau/crypto-kms`](../crypto-kms)                          | Cloud KMS       | Unified Key Management Service interface for AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.                             |
| [`@sebastienrousseau/crypto-lib`](../crypto-lib)                          | Core Library    | A modern cryptographic library for TypeScript, with post-quantum support, zero unsafe dependencies, and 100% test coverage.            |
| [`@sebastienrousseau/crypto-middleware`](../crypto-middleware)            | Middleware      | Framework-agnostic cryptographic middleware for Express, Fastify, and Koa applications.                                                |
| [`@sebastienrousseau/crypto-prisma`](../crypto-prisma)                    | ORM Adapter     | Transparent field-level encryption extension for Prisma Client, using XChaCha20-Poly1305.                                              |
| **[`@sebastienrousseau/crypto-react`](../crypto-react)** _(this package)_ | **React Hooks** | **React hooks and context provider for client-side cryptographic operations with zero boilerplate.**                                   |
| [`@sebastienrousseau/crypto-sdk`](../crypto-sdk)                          | Client SDK      | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                                  |
| [`@sebastienrousseau/crypto-server`](../crypto-server)                    | HTTP API        | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.             |
| [`@sebastienrousseau/crypto-testing`](../crypto-testing)                  | Test Support    | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                                       |
| [`@sebastienrousseau/crypto-typeorm`](../crypto-typeorm)                  | ORM Adapter     | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                        |
| [`@sebastienrousseau/crypto-vue`](../crypto-vue)                          | Vue Composables | Vue 3 composables for client-side cryptography                                                                                         |
| [`@sebastienrousseau/crypto-wasm`](../crypto-wasm)                        | Acceleration    | WebAssembly performance accelerator for crypto-lib                                                                                     |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-react provides React hooks for client-side cryptographic
operations. It wraps `@sebastienrousseau/crypto-lib` in a reactive
API with hooks for key generation, symmetric encryption, hashing,
and digital signatures. A `CryptoProvider` component supplies shared
configuration (default key, server URL, API key) to all hooks via
React context.

<p align="right"><a href="#contents">Back to Top</a></p>

## CryptoProvider

Wrap your component tree with `<CryptoProvider>` to supply shared
configuration to all hooks.

```tsx
<CryptoProvider
  defaultKey="a1b2c3d4...64-hex-chars"
  serverUrl="https://crypto.example.com"
  apiKey="my-api-key"
>
  <App />
</CryptoProvider>
```

| Prop         | Type        | Description                              |
| :----------- | :---------- | :--------------------------------------- |
| `defaultKey` | `string`    | Hex-encoded 256-bit key for `useEncrypt` |
| `serverUrl`  | `string`    | Server URL for SDK-backed operations     |
| `apiKey`     | `string`    | API key for server authentication        |
| `children`   | `ReactNode` | Child components                         |

Access the context from any child via `useCryptoContext()`.

<p align="right"><a href="#contents">Back to Top</a></p>

## Hooks Reference

| Hook           | Purpose                              | Returns                                                        |
| :------------- | :----------------------------------- | :------------------------------------------------------------- |
| `useKeypair`   | Key pair generation (all algorithms) | `{ publicKey, privateKey, algorithm, generate, isGenerating }` |
| `useEncrypt`   | Symmetric encryption (secretbox)     | `{ encrypt, decrypt, ciphertext, plaintext, isProcessing }`    |
| `useHash`      | Cryptographic hashing                | `{ hash, digest, isHashing }`                                  |
| `useSignature` | Digital signatures (sign + verify)   | `{ sign, verify, signature, isValid, isProcessing }`           |

<p align="right"><a href="#contents">Back to Top</a></p>

## Usage

<details>
<summary><b>Generate a key pair</b></summary>

```tsx
import { useKeypair } from "@sebastienrousseau/crypto-react";

function KeygenPage() {
  const { publicKey, generate, isGenerating } = useKeypair("ed25519");

  return (
    <div>
      <button onClick={() => generate()} disabled={isGenerating}>
        Generate Ed25519
      </button>
      {publicKey && <code>{publicKey.slice(0, 64)}...</code>}
    </div>
  );
}
```

</details>

<details>
<summary><b>Encrypt and decrypt</b></summary>

```tsx
import { useEncrypt } from "@sebastienrousseau/crypto-react";

function EncryptPage() {
  const { encrypt, decrypt, ciphertext, plaintext, isProcessing } =
    useEncrypt();

  return (
    <div>
      <button onClick={() => encrypt("secret message")} disabled={isProcessing}>
        Encrypt
      </button>
      {ciphertext && (
        <button onClick={() => decrypt(ciphertext)} disabled={isProcessing}>
          Decrypt
        </button>
      )}
      {plaintext && <p>Decrypted: {plaintext}</p>}
    </div>
  );
}
```

</details>

<details>
<summary><b>Hash data</b></summary>

```tsx
import { useHash } from "@sebastienrousseau/crypto-react";

function HashPage() {
  const { hash, digest, isHashing } = useHash("sha3-256");

  return (
    <div>
      <button onClick={() => hash("Hello")} disabled={isHashing}>
        SHA3-256
      </button>
      {digest && <code>{digest}</code>}
    </div>
  );
}
```

</details>

<details>
<summary><b>Sign and verify</b></summary>

```tsx
import { useKeypair, useSignature } from "@sebastienrousseau/crypto-react";

function SignPage() {
  const { publicKey, privateKey, generate } = useKeypair("ed25519");
  const { sign, verify, signature, isValid, isProcessing } = useSignature();

  return (
    <div>
      <button onClick={() => generate()}>Generate Keys</button>
      {privateKey && (
        <button
          onClick={() => sign(privateKey, "my message")}
          disabled={isProcessing}
        >
          Sign
        </button>
      )}
      {signature && publicKey && (
        <button
          onClick={() => verify(publicKey, "my message", signature)}
          disabled={isProcessing}
        >
          Verify
        </button>
      )}
      {isValid !== null && <p>Valid: {isValid ? "Yes" : "No"}</p>}
    </div>
  );
}
```

</details>

<p align="right"><a href="#contents">Back to Top</a></p>

## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category       | Example                             | Purpose                                       |
| :------------- | :---------------------------------- | :-------------------------------------------- |
| Provider       | [provider.ts](examples/provider.ts) | CryptoProvider context setup and access       |
| Key Generation | [keygen.ts](examples/keygen.ts)     | Generate Ed25519 and ML-DSA-65 key pairs      |
| Encryption     | [encrypt.ts](examples/encrypt.ts)   | Secretbox encrypt and decrypt round-trip      |
| Hashing        | [hash.ts](examples/hash.ts)         | SHA-256, SHA3-256, and BLAKE3 hashing         |
| Signing        | [sign.ts](examples/sign.ts)         | Ed25519 sign and verify with tamper detection |

<p align="right"><a href="#contents">Back to Top</a></p>

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-react run build
pnpm --filter @sebastienrousseau/crypto-react run test
pnpm --filter @sebastienrousseau/crypto-react run lint
pnpm --filter @sebastienrousseau/crypto-react run format
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
