<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-cli-logo.svg" alt="crypto-cli logo" width="128" />
</p>

<h1 align="center">crypto-cli</h1>

<p align="center">
  An interactive command-line interface for cryptographic operations,
  supporting both legacy OpenPGP and modern post-quantum algorithms.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-cli"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-cli?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT%2FApache--2.0-blue?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

**Getting started**

- [Install](#install) -- global install and one-off execution
- [Quick Start](#quick-start) -- launch the interactive menu

**CLI reference**

- [Overview](#overview) -- what crypto-cli does and why
- [Commands Reference](#commands-reference) -- legacy OpenPGP and modern crypto commands
- [Configuration](#configuration) -- environment variables
- [Examples](#examples) -- runnable shell scripts

**Operational**

- [Security](#security) -- threat model and best practices
- [Documentation](#documentation) -- API reference
- [Contributing](#contributing) -- how to get involved
- [License](#license)

---

## Install

**Global install (recommended):**

```bash
npm install -g @sebastienrousseau/crypto-cli
```

**One-off execution with npx:**

```bash
npx @sebastienrousseau/crypto-cli
```

**Local install in a project:**

```bash
pnpm add @sebastienrousseau/crypto-cli
```

Requires **Node >= 22**.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Quick Start

Launch the interactive menu:

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

## Overview

crypto-cli is the command-line interface for the Crypto Service
Suite. It offers both legacy OpenPGP commands (key generation,
encryption, decryption, signing, verification, revocation) and
modern v2 commands using `@noble/*` primitives with post-quantum
algorithm support. All operations run interactively via a guided
prompt menu.

<p align="right"><a href="#contents">Back to Top</a></p>

---

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

<p align="right"><a href="#contents">Back to Top</a></p>

---

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

---

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

---

## Security

- **Key material** is never logged to the console by default. Legacy
  commands suppress passphrase and private key output.
- **Argon2** parameters use secure defaults: 64 MiB memory,
  3 iterations, 4 lanes.
- **Post-quantum algorithms** (ML-KEM, ML-DSA) follow the NIST
  FIPS 203/204 specifications.
- **AEAD ciphers** generate random nonces per encryption;
  `AES-GCM-SIV` provides nonce-misuse resistance.
- **Timing-safe comparisons** are used for all signature and
  password verification.

If you discover a security vulnerability, please report it
privately via
[GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories/new).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Documentation

API reference documentation is generated with TypeDoc. Build it
locally with:

```bash
pnpm --filter @sebastienrousseau/crypto-cli docs
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
