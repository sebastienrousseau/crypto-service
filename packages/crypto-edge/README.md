<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-edge-logo.svg" alt="crypto-edge" width="128" />
</p>

<h1 align="center">crypto-edge</h1>

<p align="center">
  Edge and serverless runtime adapter for crypto-lib -- runs on Cloudflare Workers, Vercel Edge, Deno, Bun, and browsers.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-edge"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-edge?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License MIT" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

- [Install](#install) — add the package to your project
- [Quick Start](#quick-start) — hash data in three lines
- [Supported Runtimes](#supported-runtimes) — where crypto-edge runs
- [Features](#features) — runtime detection, Web Crypto, polyfills
- [Examples](#examples) — runnable scripts for every target
- [Security](#security) — guarantees and threat model
- [License](#license) — Apache-2.0 OR MIT

---

## Install

**npm / pnpm**

```bash
npm install @sebastienrousseau/crypto-edge
# or
pnpm add @sebastienrousseau/crypto-edge
```

**From source**

```bash
git clone https://github.com/sebastienrousseau/crypto-service.git
cd crypto-service
pnpm install
pnpm --filter @sebastienrousseau/crypto-edge build
```

> **Requirements:** Any runtime with the Web Crypto API (`crypto.subtle`). No Node.js-specific dependencies. Node >= 22 for local development.

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

## Supported Runtimes

| Runtime            | Identifier           | Web Crypto | TextEncoder | Notes                            |
| ------------------ | -------------------- | :--------: | :---------: | -------------------------------- |
| Cloudflare Workers | `cloudflare-workers` |    Yes     |     Yes     | Full support                     |
| Vercel Edge        | `vercel-edge`        |    Yes     |     Yes     | Full support                     |
| Deno               | `deno`               |    Yes     |     Yes     | Full support                     |
| Bun                | `bun`                |    Yes     |     Yes     | Full support                     |
| Browsers           | `browser`            |    Yes     |     Yes     | Modern browsers (Chrome 37+)     |
| Node.js            | `node`               |    Yes     |     Yes     | Node >= 15 (globalThis.crypto)   |
| Unknown            | `unknown`            |   Varies   |   Varies    | Use `getCapabilities()` to check |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Features

### Runtime Detection

Detect the current JavaScript runtime and probe its capabilities:

```ts
import {
  detectRuntime,
  getCapabilities,
  isEdgeCryptoAvailable,
} from "@sebastienrousseau/crypto-edge";

// Simple runtime identifier
const runtime = detectRuntime(); // "cloudflare-workers" | "vercel-edge" | "deno" | ...

// Full capability matrix
const caps = getCapabilities();
// {
//   runtime: "cloudflare-workers",
//   hasWebCrypto: true,
//   hasSubtle: true,
//   hasNodeCrypto: false,
//   hasTextEncoder: true,
// }

// Quick check: can we use crypto.subtle?
if (isEdgeCryptoAvailable()) {
  // Safe to call hash(), encrypt(), etc.
}
```

### Web Crypto API

All functions use **only** the standard Web Crypto API (`crypto.subtle`). No Node.js built-ins are imported.

#### Hashing

```ts
import { hash } from "@sebastienrousseau/crypto-edge";

const sha256 = await hash("SHA-256", "hello");
const sha512 = await hash("SHA-512", new Uint8Array([1, 2, 3]));
```

#### Encryption / Decryption (AES-GCM)

```ts
import { generateKey, encrypt, decrypt } from "@sebastienrousseau/crypto-edge";

const key = await generateKey({ algorithm: "AES-GCM", length: 256 });
const { ciphertext } = await encrypt({
  key,
  plaintext: new TextEncoder().encode("secret message"),
});
const plaintext = await decrypt({ key, ciphertext });
```

#### Signing / Verification (HMAC)

```ts
import { sign, verify } from "@sebastienrousseau/crypto-edge";

const key = new Uint8Array(32); // your HMAC key
crypto.getRandomValues(key);

const sig = await sign({ key, data: new TextEncoder().encode("payload") });
const ok = await verify({
  key,
  data: new TextEncoder().encode("payload"),
  signature: sig,
});
```

#### Key Generation

```ts
import { generateKey } from "@sebastienrousseau/crypto-edge";

const aesKey = await generateKey({ algorithm: "AES-GCM", length: 256 });
const aes128 = await generateKey({ algorithm: "AES-CBC", length: 128 });
```

### Polyfills

Some minimal runtimes may be missing standard globals. Call `installPolyfills()` once at startup:

```ts
import { installPolyfills } from "@sebastienrousseau/crypto-edge";

const installed = installPolyfills();
// {
//   textEncoder: true,  // polyfilled
//   textDecoder: true,  // polyfilled
//   btoa: false,        // already present
//   atob: false,        // already present
//   getRandomValues: false, // already present
// }
```

Polyfills provided:

| API                      | Polyfill                       | Security     |
| ------------------------ | ------------------------------ | ------------ |
| `TextEncoder`            | Pure JS UTF-8 encoder          | Safe         |
| `TextDecoder`            | Pure JS UTF-8 decoder          | Safe         |
| `btoa`                   | Pure JS Base64 encode          | Safe         |
| `atob`                   | Pure JS Base64 decode          | Safe         |
| `crypto.getRandomValues` | `Math.random`-based (INSECURE) | Testing only |

> **Warning:** The `crypto.getRandomValues` polyfill uses `Math.random` and is NOT cryptographically secure. It is intended for testing in environments without a CSPRNG. A console warning is emitted when activated.

### Limitations

- **No Node.js built-ins.** This package deliberately avoids `Buffer`,
  `node:crypto`, `fs`, and other Node-specific APIs. Use
  `@sebastienrousseau/crypto-lib` directly for full Node.js
  capabilities.
- **Symmetric only.** The Web Crypto wrapper focuses on AES-GCM and
  HMAC. For asymmetric operations (ECDSA, RSA, post-quantum), use
  crypto-lib.
- **Algorithm coverage.** Only algorithms available in the Web Crypto
  specification are supported. Post-quantum algorithms are not
  available in edge runtimes via this package.
- **The `getRandomValues` polyfill is insecure.** Only use it for
  testing; never rely on it for key generation or encryption in
  production.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/` directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category   | Example                             | Purpose                     |
| ---------- | ----------------------------------- | --------------------------- |
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

**No native dependencies.** All cryptographic operations use the Web Crypto API built into each runtime. There is no C, Rust, or WASM code to audit separately.

**Timing-safe comparisons.** HMAC verification uses the Web Crypto API's own constant-time comparison.

**Zero unsafe code.** No `eval`, no dynamic `require`, no `Function` constructor. No ambient network access.

**Secure defaults.** AES-GCM nonces are always generated randomly via `crypto.getRandomValues`. Key lengths default to 256 bits.

**Responsible disclosure.** Report vulnerabilities via [GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service Suite contributors.

<p align="right"><a href="#contents">Back to Top</a></p>
