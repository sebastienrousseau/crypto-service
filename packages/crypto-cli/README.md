<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-cli-logo.svg" alt="crypto-cli logo" width="360" />
</p>

<h1 align="center">@sebastienrousseau/crypto-cli</h1>

<p align="center">
  An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main"><img src="https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service?branch=main&style=for-the-badge" alt="Coverage" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-cli"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-cli.svg?style=for-the-badge&color=f14041&logo=npm" alt="Registry" /></a>
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
pnpm add @sebastienrousseau/crypto-cli
# or
npm install @sebastienrousseau/crypto-cli
# or
yarn add @sebastienrousseau/crypto-cli
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

Run a subcommand, for scripts and CI:

```bash
crypto-cli hash --json < file.txt
crypto-cli hash --algorithm blake3 file.txt
crypto-cli cbom scan src --output cbom.json
```

Run it with no arguments in a terminal for the interactive menu:

```bash
cryptocli
```

You will be presented with a selection prompt:

```
? Select a function to execute.

  Generate         -- Generate a new OpenPGP key pair
  Encrypt          -- Encrypt a message (OpenPGP)
  Decrypt          -- Decrypt a message (OpenPGP)
  Modern Keygen    -- Generate keys (Ed25519, ML-DSA, ML-KEM, etc.)
  Modern Hash      -- Hash data (SHA-2, SHA-3, BLAKE2b, BLAKE3)
  Modern Encrypt   -- Encrypt (XChaCha20, AES-GCM, AES-GCM-SIV)
  Modern Sign      -- Sign/verify (Ed25519, ECDSA, Schnorr, ML-DSA)
  Password Hash    -- Hash/verify passwords (Argon2id/i/d)
  Help             -- Get help on a command
```

Use arrow keys to navigate, then press Enter to select a command.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## The Crypto Service ecosystem

Crypto Service provides a complete cryptography stack across 14 specialized packages:

| Package                                                               | Role             | Description                                                                                                                                |
| :-------------------------------------------------------------------- | :--------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| [`@sebastienrousseau/crypto-api`](../crypto-api)                      | API Schemas      | Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.                                    |
| **[`@sebastienrousseau/crypto-cli`](../crypto-cli)** _(this package)_ | **Terminal CLI** | **An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms.** |
| [`@sebastienrousseau/crypto-edge`](../crypto-edge)                    | Edge Runtime     | Edge-runtime cryptographic operations using the Web Crypto API, optimized for Cloudflare Workers, Vercel Edge, and Deno.                   |
| [`@sebastienrousseau/crypto-kms`](../crypto-kms)                      | Cloud KMS        | Unified Key Management Service interface for AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.                                 |
| [`@sebastienrousseau/crypto-lib`](../crypto-lib)                      | Core Library     | A modern cryptographic library for TypeScript, with post-quantum support, zero unsafe dependencies, and 100% test coverage.                |
| [`@sebastienrousseau/crypto-middleware`](../crypto-middleware)        | Middleware       | Framework-agnostic cryptographic middleware for Express, Fastify, and Koa applications.                                                    |
| [`@sebastienrousseau/crypto-prisma`](../crypto-prisma)                | ORM Adapter      | Transparent field-level encryption extension for Prisma Client, using XChaCha20-Poly1305.                                                  |
| [`@sebastienrousseau/crypto-react`](../crypto-react)                  | React Hooks      | React hooks and context provider for client-side cryptographic operations with zero boilerplate.                                           |
| [`@sebastienrousseau/crypto-sdk`](../crypto-sdk)                      | Client SDK       | A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.                                      |
| [`@sebastienrousseau/crypto-server`](../crypto-server)                | HTTP API         | A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.                 |
| [`@sebastienrousseau/crypto-testing`](../crypto-testing)              | Test Support     | Deterministic keys, fast mocks, and test fixtures for crypto-lib                                                                           |
| [`@sebastienrousseau/crypto-typeorm`](../crypto-typeorm)              | ORM Adapter      | TypeORM column-level encryption with a single decorator, powered by crypto-lib.                                                            |
| [`@sebastienrousseau/crypto-vue`](../crypto-vue)                      | Vue Composables  | Vue 3 composables for client-side cryptography                                                                                             |
| [`@sebastienrousseau/crypto-wasm`](../crypto-wasm)                    | Acceleration     | WebAssembly performance accelerator for crypto-lib                                                                                         |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-cli is the command-line interface for the Crypto Service
Suite. It offers both legacy OpenPGP commands (key generation,
encryption, decryption, signing, verification, revocation) and
modern v2 commands using `@noble/*` primitives with post-quantum
algorithm support. Hashing, key generation and CBOM scan and audit
also run as non-interactive subcommands with JSON output; every
operation is available from the interactive menu.

<p align="right"><a href="#contents">Back to Top</a></p>

## Commands Reference

### Legacy Commands (OpenPGP)

| Command    | Description                                                    |
| :--------- | :------------------------------------------------------------- |
| `Generate` | Generate a new OpenPGP key pair (RSA or ECC)                   |
| `Encrypt`  | Encrypt a message using public keys, passwords, or both        |
| `Decrypt`  | Decrypt a message with a private key, session key, or password |
| `Sign`     | Sign a message with an OpenPGP private key                     |
| `Verify`   | Verify signatures of a cleartext signed message                |
| `Revoke`   | Revoke an OpenPGP key with a reason                            |
| `Reformat` | Reformat signature packets and rewrap a key object             |
| `Session`  | Generate a new session key object from public key preferences  |

### Modern Commands (v2)

| Command          | Description                                                 |
| :--------------- | :---------------------------------------------------------- |
| `Modern Keygen`  | Generate key pairs for 12 algorithms including post-quantum |
| `Modern Hash`    | Hash data with 7 algorithms (SHA-2, SHA-3, BLAKE)           |
| `Modern Encrypt` | Encrypt/decrypt with 5 AEAD ciphers                         |
| `Modern Sign`    | Sign and verify with 8 algorithms including ML-DSA          |
| `Password Hash`  | Hash and verify passwords with 3 Argon2 variants            |

### Non-interactive commands

With arguments, `crypto-cli` runs a subcommand instead of the menu:

- `--json` prints the result as one line of JSON on stdout, and
  nothing else goes to stdout.
- A command that takes a file reads standard input when the file is
  omitted or `-`.
- Errors, usage and notes go to stderr.
- Exit codes: `0` success, `1` the operation failed (unreadable input,
  a cryptographic error, an invalid CBOM, a CBOM audit with status
  `FAIL`), `2` usage error (unknown command or option, missing or
  invalid argument).
- With no arguments, the interactive menu starts only when stdin and
  stdout are both terminals; otherwise usage goes to stderr and the
  exit code is `2`.

The reference below is generated from the command definitions
(`pnpm run readme:usage`); a test fails when it is out of date.

<!-- cli-usage:start (generated: pnpm run readme:usage) -->

#### `crypto-cli`

```text
Usage: crypto-cli [options] [command]

Cryptographic operations from the command line. Run without arguments in a
terminal for the interactive menu.

Options:
  -V, --version          print the version
  -h, --help             print help

Commands:
  hash [options] [file]  Hash a file, or standard input when no file is given
  keygen [options]       Generate a key pair (the private key is printed to
                         stdout)
  cbom                   Generate or audit a Cryptographic Bill of Materials
```

#### `crypto-cli hash`

```text
Usage: crypto-cli hash [options] [file]

Hash a file, or standard input when no file is given

Arguments:
  file                    file to hash; '-' or omitted reads standard input

Options:
  -a, --algorithm <name>  hash algorithm (choices: "sha256", "sha384", "sha512",
                          "sha3-256", "sha3-512", "blake2b", "blake3", default:
                          "sha256")
  --json                  print the result as one line of JSON
  -h, --help              print help
```

#### `crypto-cli keygen`

```text
Usage: crypto-cli keygen [options]

Generate a key pair (the private key is printed to stdout)

Options:
  -a, --algorithm <name>  key algorithm (choices: "ed25519", "x25519", "ed448",
                          "x448", "p256", "p384", "ml-kem-512", "ml-kem-768",
                          "ml-kem-1024", "ml-dsa-44", "ml-dsa-65", "ml-dsa-87")
  --kid <id>              key ID (default: thumbprint of the public key)
  --use <use>             intended key usage (choices: "sig", "enc")
  --json                  print the key pair as one line of JSON
  -h, --help              print help
```

#### `crypto-cli cbom`

```text
Usage: crypto-cli cbom [options] [command]

Generate or audit a Cryptographic Bill of Materials

Options:
  -h, --help                  print help

Commands:
  scan [options] [directory]  Scan source code and print its CBOM
  audit [options] [file]      Validate and audit a CBOM; exits 1 when the audit
                              status is FAIL
```

#### `crypto-cli cbom scan`

```text
Usage: crypto-cli cbom scan [options] [directory]

Scan source code and print its CBOM

Arguments:
  directory              directory or file to scan (default: ".")

Options:
  -f, --format <format>  CBOM standard (choices: "cyclonedx", "spdx", default:
                         "cyclonedx")
  -o, --output <file>    write the CBOM to a file, not stdout
  --json                 print the CBOM as one line of JSON
  -h, --help             print help
```

#### `crypto-cli cbom audit`

```text
Usage: crypto-cli cbom audit [options] [file]

Validate and audit a CBOM; exits 1 when the audit status is FAIL

Arguments:
  file                 CBOM JSON file; '-' or omitted reads standard input

Options:
  -o, --output <file>  write the audit report to a file, not stdout
  --json               print the audit report as one line of JSON
  -h, --help           print help
```

<!-- cli-usage:end -->

<p align="right"><a href="#contents">Back to Top</a></p>

## Configuration

The CLI respects the following environment variables:

| Variable             | Default      | Description                               |
| :------------------- | :----------- | :---------------------------------------- |
| `CRYPTO_KEY_DIR`     | `./keys`     | Directory for reading key files           |
| `CRYPTO_DATA_DIR`    | `./data`     | Directory for reading data files          |
| `CRYPTO_KEY_OUT_DIR` | `./keys/out` | Directory for writing generated key files |

```bash
export CRYPTO_KEY_DIR="$HOME/.crypto/keys"
export CRYPTO_DATA_DIR="$HOME/.crypto/data"
export CRYPTO_KEY_OUT_DIR="$HOME/.crypto/keys/out"
cryptocli
```

<p align="right"><a href="#contents">Back to Top</a></p>

## Examples

Runnable shell scripts are provided in the [`examples/`](examples/)
directory:

| Category   | Example                             | Purpose                                   |
| :--------- | :---------------------------------- | :---------------------------------------- |
| Keygen     | [keygen.sh](examples/keygen.sh)     | Generate Ed25519, P-256, and ML-KEM keys  |
| Hashing    | [hash.sh](examples/hash.sh)         | Hash data with various algorithms         |
| Encryption | [encrypt.sh](examples/encrypt.sh)   | Encrypt and decrypt with modern ciphers   |
| Signing    | [sign.sh](examples/sign.sh)         | Sign and verify with modern algorithms    |
| Passwords  | [password.sh](examples/password.sh) | Hash and verify passwords with Argon2     |
| Legacy     | [legacy.sh](examples/legacy.sh)     | Legacy OpenPGP key generation and signing |

Run any example:

```bash
bash examples/keygen.sh
```

<p align="right"><a href="#contents">Back to Top</a></p>

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-cli run build
pnpm --filter @sebastienrousseau/crypto-cli run test
pnpm --filter @sebastienrousseau/crypto-cli run lint
pnpm --filter @sebastienrousseau/crypto-cli run format
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
