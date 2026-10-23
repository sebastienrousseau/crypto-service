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

| Package                                                                                                                                       | Role            | Description                                                                                                                    |
| :-------------------------------------------------------------------------------------------------------------------------------------------- | :-------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-api)                          | API docs        | Postman collection types and a Postman-to-Markdown converter; the server's API contract is its OpenAPI document.               |
| [`@sebastienrousseau/crypto-benchmarks`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-benchmarks)            | Benchmarks      | Benchmarks comparing classical and post-quantum cryptography: ops/sec, latency and throughput.                                 |
| [`@sebastienrousseau/crypto-cbom`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-cbom)                        | CBOM            | Cryptographic Bill of Materials generator and auditor (CycloneDX 1.6, SPDX 3.0).                                               |
| [`@sebastienrousseau/crypto-cli`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-cli)                          | Terminal CLI    | Command-line interface: hashing, key generation, encryption, signing, HPKE, Argon2id and CBOM scans, with an interactive menu. |
| [`@sebastienrousseau/crypto-edge`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-edge)                        | Edge Runtime    | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.       |
| [`@sebastienrousseau/crypto-kms`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-kms)                          | Cloud KMS       | Unified KMS interface: AWS KMS, Google Cloud KMS, Vault Transit and local providers; Azure is a stub.                          |
| [`@sebastienrousseau/crypto-lib`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-lib)                          | Core Library    | Core library: post-quantum ML-KEM, ML-DSA and SLH-DSA, plus classical, modern and OpenPGP cryptography for TypeScript.         |
| [`@sebastienrousseau/crypto-lsp`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-lsp)                          | IDE Analysis    | Language server that flags weak and quantum-vulnerable cryptography in the editor, with quick fixes.                           |
| [`@sebastienrousseau/crypto-mcp`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-mcp)                          | AI Agents       | Model Context Protocol server exposing cryptography tools to AI assistants and agents.                                         |
| [`@sebastienrousseau/crypto-middleware`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-middleware)            | Middleware      | Cryptographic middleware for Express and Fastify: decrypt requests, encrypt responses, verify HMAC signatures and JWTs.        |
| [`@sebastienrousseau/crypto-prisma`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-prisma)                    | ORM Adapter     | Transparent field-level encryption extension for Prisma Client, using XChaCha20-Poly1305.                                      |
| **[`@sebastienrousseau/crypto-react`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-react)** _(this package)_ | **React Hooks** | **React hooks and context provider for client-side cryptographic operations with zero boilerplate.**                           |
| [`@sebastienrousseau/crypto-sdk`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-sdk)                          | Client SDK      | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                          |
| [`@sebastienrousseau/crypto-server`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-server)                    | HTTP API        | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.     |
| [`@sebastienrousseau/crypto-testing`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-testing)                  | Test Support    | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                               |
| [`@sebastienrousseau/crypto-typeorm`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-typeorm)                  | ORM Adapter     | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                |
| [`@sebastienrousseau/crypto-vue`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-vue)                          | Vue Composables | Vue 3 composables for client-side cryptography                                                                                 |
| [`@sebastienrousseau/crypto-wasm`](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-wasm)                        | Acceleration    | Placeholder for a WebAssembly accelerator; no WebAssembly module ships yet.                                                    |

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
<CryptoProvider defaultKey={keyTheUserUnlocked}>
  <App />
</CryptoProvider>
```

| Prop         | Type        | Description                                                         |
| :----------- | :---------- | :------------------------------------------------------------------ |
| `defaultKey` | `string`    | Hex-encoded 256-bit key for `useEncrypt`                            |
| `serverUrl`  | `string`    | Deprecated: no hook reads it                                        |
| `apiKey`     | `string`    | Deprecated: no hook reads it, and an API key in a browser is public |
| `children`   | `ReactNode` | Child components                                                    |

Everything these hooks hold runs in the browser. A key written into your
bundle, such as a literal `defaultKey`, is public; pass keys the user
supplies or unlocks at runtime. Keys in hook state, such as
`useKeypair`'s `privateKey`, can be read by any script on the page and by
React DevTools, and JavaScript cannot wipe them: call `clear()` when you
are done, and keep long-lived keys on a server (for example
crypto-server's `/v2/keys/generate`, which never returns the private key
unless asked).

Access the context from any child via `useCryptoContext()`.

<p align="right"><a href="#contents">Back to Top</a></p>

## Hooks Reference

| Hook           | Purpose                              | Returns                                                               |
| :------------- | :----------------------------------- | :-------------------------------------------------------------------- |
| `useKeypair`   | Key pair generation (all algorithms) | `{ publicKey, privateKey, algorithm, generate, isGenerating, clear }` |
| `useEncrypt`   | Symmetric encryption (secretbox)     | `{ encrypt, decrypt, ciphertext, plaintext, isProcessing }`           |
| `useHash`      | Cryptographic hashing                | `{ hash, digest, isHashing }`                                         |
| `useSignature` | Digital signatures (sign + verify)   | `{ sign, verify, signature, isValid, isProcessing }`                  |

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
