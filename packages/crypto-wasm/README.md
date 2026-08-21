<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-wasm-logo.svg" alt="crypto-wasm logo" width="128" />
</p>

<h1 align="center">crypto-wasm</h1>

<p align="center">
  WebAssembly performance accelerator for crypto-lib -- near-native
  speed for SHA-256, AES-GCM, Argon2, Ed25519, and X25519.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-wasm"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-wasm?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT%2FApache--2.0-blue?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

**Getting started**

- [Install](#install) -- npm, pnpm, source
- [Quick Start](#quick-start) -- accelerate crypto operations in three lines

**Package reference**

- [Overview](#overview) -- what crypto-wasm does and why
- [How It Works](#how-it-works) -- auto-detection, fallback, and integration
- [Supported Operations](#supported-operations) -- full list of accelerated primitives
- [Building from Source](#building-from-source) -- compile the WASM module with Rust
- [Benchmarks](#benchmarks) -- JS vs WASM performance comparison
- [Examples](#examples) -- runnable scripts for every feature

**Operational**

- [Security](#security) -- responsible disclosure
- [Documentation](#documentation) -- API reference
- [Contributing](#contributing) -- how to get involved
- [License](#license)

---

## Install

```bash
pnpm add @sebastienrousseau/crypto-wasm
# or
npm install @sebastienrousseau/crypto-wasm
```

Node >= 22 or any environment with WebAssembly support (all modern
browsers, Deno, Bun).

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

---

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

---

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

---

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

---

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

---

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

---

## Security

**Transparent fallback.** If the WASM module is unavailable, all
operations fall back to the pure-JavaScript implementation with no
code changes required.

**No native dependencies.** The JavaScript fallback uses the audited
`@noble/*` family -- pure TypeScript, no C bindings.

**Responsible disclosure.** Report vulnerabilities via
[GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Documentation

API reference documentation is generated with TypeDoc. Build it
locally with:

```bash
pnpm --filter @sebastienrousseau/crypto-wasm docs
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
