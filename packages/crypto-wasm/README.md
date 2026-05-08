<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->
<!-- Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved. -->

<div align="center">

![Crypto WASM logo](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-wasm-logo.svg)

# Crypto WASM

WebAssembly performance accelerator for crypto-lib — near-native speed for SHA-256, AES-GCM, Argon2, Ed25519, and X25519.

[![Build](https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?style=for-the-badge&branch=main)](https://github.com/sebastienrousseau/crypto-service/actions)
[![npm](https://img.shields.io/npm/v/@sebastienrousseau/crypto-wasm.svg?style=for-the-badge)](https://www.npmjs.com/package/@sebastienrousseau/crypto-wasm)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D22-green.svg?style=for-the-badge)](https://nodejs.org/)

**[Website](https://crypto-service.co)
&middot; [Documentation](https://crypto-service.co/docs/)
&middot; [Submit an Issue](https://github.com/sebastienrousseau/crypto-service/issues)
&middot; [Contributing Guidelines](https://github.com/sebastienrousseau/crypto-service/blob/main/.github/CONTRIBUTING.md)**

</div>

---

## Contents

- [Install](#install) &mdash; Add the accelerator to your project
- [Quick Start](#quick-start) &mdash; Accelerate crypto operations in three lines
- [How It Works](#how-it-works) &mdash; Auto-detection, fallback, and integration
- [Supported Operations](#supported-operations) &mdash; Full list of accelerated primitives
- [Building from Source](#building-from-source) &mdash; Compile the WASM module with Rust
- [Benchmarks](#benchmarks) &mdash; JS vs WASM performance comparison
- [Examples](#examples) &mdash; Runnable scripts for every feature
- [License](#license) &mdash; MIT

---

## Install

```bash
# npm
npm install @sebastienrousseau/crypto-wasm

# yarn
yarn add @sebastienrousseau/crypto-wasm

# pnpm
pnpm add @sebastienrousseau/crypto-wasm
```

> **Requirements:** Node >= 22 or any environment with WebAssembly support (all modern browsers, Deno, Bun).

---

## Quick Start

```ts
import {
  WasmAccelerator,
  isWasmSupported,
} from "@sebastienrousseau/crypto-wasm";

const accel = new WasmAccelerator();
await accel.init();

// Hash data — uses WASM when available, JS fallback otherwise
const digest = await accel.hash("sha256", new TextEncoder().encode("hello"));
console.log(Buffer.from(digest).toString("hex"));
```

---

## How It Works

### Auto-Detection

When `crypto-lib` detects `@sebastienrousseau/crypto-wasm` as an installed dependency, it automatically routes heavy cryptographic operations through the WASM module. No configuration is needed.

```
crypto-lib  -->  crypto-wasm installed?
                   |               |
                  YES              NO
                   |               |
              WASM path       JS fallback
              (near-native)   (pure JS)
```

### Transparent Fallback

If the WASM module is not compiled or not available in the current runtime, every operation falls back to the equivalent pure-JavaScript implementation. Your application code does not need to handle either case differently.

### Initialization

```ts
const accel = new WasmAccelerator();

// Option 1: Auto-load from default path (wasm/crypto_accel.wasm)
await accel.init();

// Option 2: Load from a custom buffer
const buffer = await fetch("/path/to/crypto_accel.wasm");
await accel.init(buffer);

// Option 3: Load from an ArrayBuffer
const bytes = await fs.readFile("crypto_accel.wasm");
await accel.init(bytes);
```

### Runtime Detection

```ts
import { detectCapabilities } from "@sebastienrousseau/crypto-wasm";

const caps = detectCapabilities();
// { wasmSupported: true, streamingSupported: true, simdSupported: true }
```

---

## Supported Operations

| Operation       | ID                | Description                          |
| --------------- | ----------------- | ------------------------------------ |
| SHA-256         | `hash-sha256`     | SHA-256 hash computation             |
| SHA-512         | `hash-sha512`     | SHA-512 hash computation             |
| BLAKE3          | `hash-blake3`     | BLAKE3 hash computation              |
| AES-GCM Encrypt | `aes-gcm-encrypt` | AES-256-GCM authenticated encryption |
| AES-GCM Decrypt | `aes-gcm-decrypt` | AES-256-GCM authenticated decryption |
| Argon2          | `argon2-hash`     | Argon2id/i/d password hashing        |
| Ed25519 Sign    | `ed25519-sign`    | Ed25519 signature generation         |
| Ed25519 Verify  | `ed25519-verify`  | Ed25519 signature verification       |
| X25519          | `x25519-exchange` | X25519 Diffie-Hellman key exchange   |

---

## Building from Source

The WASM module is compiled from Rust. A Rust toolchain with `wasm32-unknown-unknown` target is required.

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

The compiled `.wasm` file is placed in `wasm/crypto_accel.wasm`. Until the Rust source is added, the `build:wasm` script is a no-op placeholder.

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
| --------------------- | ---------------- |
| SHA-256 (large input) | 2-5x             |
| AES-GCM               | 3-8x             |
| Argon2                | 5-15x            |
| Ed25519 Sign          | 2-4x             |
| Ed25519 Verify        | 2-4x             |
| X25519                | 2-4x             |

> Note: Actual speedups depend on runtime, hardware, and input size. Without the compiled WASM module, both paths use the JS fallback and speedup will be approximately 1.0x.

---

## Examples

Runnable TypeScript examples are provided in the `examples/` directory.

| Example    | File                                        | Description                                |
| ---------- | ------------------------------------------- | ------------------------------------------ |
| Accelerate | [`accelerate.ts`](./examples/accelerate.ts) | Basic WASM acceleration for hashing        |
| Benchmark  | [`benchmark.ts`](./examples/benchmark.ts)   | Compare JS vs WASM performance             |
| Detect     | [`detect.ts`](./examples/detect.ts)         | Check WASM availability and capabilities   |
| Fallback   | [`fallback.ts`](./examples/fallback.ts)     | Graceful fallback when WASM is unavailable |

```bash
npx ts-node examples/accelerate.ts
```

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

<p align="right"><a href="#contents">Back to Top</a></p>
