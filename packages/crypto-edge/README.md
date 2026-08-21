<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-edge-logo.svg" alt="crypto-edge logo" width="128" />
</p>

<h1 align="center">crypto-edge</h1>

<p align="center">
  Edge and serverless runtime adapter for crypto-lib -- runs on
  Cloudflare Workers, Vercel Edge, Deno, Bun, and browsers.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-edge"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-edge?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT%2FApache--2.0-blue?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

**Getting started**

- [Install](#install) -- npm, pnpm, source
- [Quick Start](#quick-start) -- hash data in three lines

**Package reference**

- [Overview](#overview) -- what crypto-edge does and why
- [Supported Runtimes](#supported-runtimes) -- where crypto-edge runs
- [Features](#features) -- runtime detection, Web Crypto, polyfills
- [Examples](#examples) -- runnable scripts for every target

**Operational**

- [Security](#security) -- guarantees and threat model
- [Documentation](#documentation) -- API reference
- [Contributing](#contributing) -- how to get involved
- [License](#license)

---

## Install

```bash
pnpm add @sebastienrousseau/crypto-edge
# or
npm install @sebastienrousseau/crypto-edge
```

### From source

```bash
git clone https://github.com/sebastienrousseau/crypto-service.git
cd crypto-service
pnpm install
pnpm --filter @sebastienrousseau/crypto-edge build
```

Any runtime with the Web Crypto API (`crypto.subtle`). No
Node.js-specific dependencies. Node >= 22 for local development.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Quick Start

```ts
import { hash, detectRuntime } from "@sebastienrousseau/crypto-edge";

console.log("Running on:", detectRuntime());

const digest = await hash("SHA-256", "hello world");
console.log(digest);
// b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-edge adapts the Crypto Service Suite for edge and serverless
runtimes. It provides runtime detection, a Web Crypto wrapper for
hashing, AES-GCM encryption, HMAC signing, and key generation, plus
polyfills for minimal environments. All functions use only the
standard Web Crypto API -- no Node.js built-ins are imported.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Supported Runtimes

| Runtime            | Identifier           | Web Crypto | Notes                            |
| :----------------- | :------------------- | :--------: | :------------------------------- |
| Cloudflare Workers | `cloudflare-workers` |    Yes     | Full support                     |
| Vercel Edge        | `vercel-edge`        |    Yes     | Full support                     |
| Deno               | `deno`               |    Yes     | Full support                     |
| Bun                | `bun`                |    Yes     | Full support                     |
| Browsers           | `browser`            |    Yes     | Modern browsers (Chrome 37+)     |
| Node.js            | `node`               |    Yes     | Node >= 15 (globalThis.crypto)   |
| Unknown            | `unknown`            |   Varies   | Use `getCapabilities()` to check |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Features

### Runtime Detection

```ts
import {
  detectRuntime,
  getCapabilities,
  isEdgeCryptoAvailable,
} from "@sebastienrousseau/crypto-edge";

const runtime = detectRuntime();
const caps = getCapabilities();
if (isEdgeCryptoAvailable()) {
  // Safe to call hash(), encrypt(), etc.
}
```

### Web Crypto API

```ts
import {
  hash,
  generateKey,
  encrypt,
  decrypt,
} from "@sebastienrousseau/crypto-edge";

// Hashing
const sha256 = await hash("SHA-256", "hello");

// Encryption / Decryption (AES-GCM)
const key = await generateKey({ algorithm: "AES-GCM", length: 256 });
const { ciphertext } = await encrypt({
  key,
  plaintext: new TextEncoder().encode("secret"),
});
const plaintext = await decrypt({ key, ciphertext });
```

### Polyfills

Call `installPolyfills()` once at startup for minimal runtimes
missing standard globals:

```ts
import { installPolyfills } from "@sebastienrousseau/crypto-edge";

const installed = installPolyfills();
```

Polyfills provided: `TextEncoder`, `TextDecoder`, `btoa`, `atob`,
and a `Math.random`-based `crypto.getRandomValues` (testing only --
**not** cryptographically secure).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category   | Example                             | Purpose                     |
| :--------- | :---------------------------------- | :-------------------------- |
| Detection  | [detect.ts](examples/detect.ts)     | Runtime detection           |
| Hashing    | [hash.ts](examples/hash.ts)         | Edge-compatible hashing     |
| Encryption | [encrypt.ts](examples/encrypt.ts)   | AES-GCM encrypt and decrypt |
| Workers    | [workers.ts](examples/workers.ts)   | Cloudflare Workers usage    |
| Vercel     | [vercel.ts](examples/vercel.ts)     | Vercel Edge Function usage  |
| Browser    | [browser.ts](examples/browser.ts)   | Browser usage               |
| Polyfills  | [polyfill.ts](examples/polyfill.ts) | Polyfill installation       |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

**No native dependencies.** All cryptographic operations use the
Web Crypto API built into each runtime. There is no C, Rust, or
WASM code to audit separately.

**Timing-safe comparisons.** HMAC verification uses the Web Crypto
API's own constant-time comparison.

**Zero unsafe code.** No `eval`, no dynamic `require`, no `Function`
constructor. No ambient network access.

**Secure defaults.** AES-GCM nonces are always generated randomly
via `crypto.getRandomValues`. Key lengths default to 256 bits.

**Responsible disclosure.** Report vulnerabilities via
[GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Documentation

API reference documentation is generated with TypeDoc. Build it
locally with:

```bash
pnpm --filter @sebastienrousseau/crypto-edge docs
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup,
coding standards, and pull request guidelines.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)
or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service
Suite contributors.

<p align="right"><a href="#contents">Back to Top</a></p>
