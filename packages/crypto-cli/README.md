<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

<div align="center">

<img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-cli-logo.svg" alt="Crypto CLI Logo" width="261" />

# Crypto CLI

An interactive command-line interface for cryptographic operations, supporting both legacy OpenPGP and modern post-quantum algorithms.

[![Build Status](https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github)](https://github.com/sebastienrousseau/crypto-service/actions)
[![npm](https://img.shields.io/npm/v/@sebastienrousseau/crypto-cli?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@sebastienrousseau/crypto-cli)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge)](https://github.com/sebastienrousseau/crypto-service)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)

</div>

---

## Contents

- [Install](#install) -- global install and one-off execution
- [Quick Start](#quick-start) -- launch the interactive menu
- [Commands](#commands) -- legacy OpenPGP and modern crypto commands
- [Modern Command Details](#modern-command-details) -- algorithms and
  options per command
- [Examples](#examples) -- runnable shell scripts
- [Configuration](#configuration) -- environment variables
- [Security](#security) -- threat model and best practices
- [License](#license) -- terms of use

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

> **Requires:** Node.js >= 22

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
  Reformat         -- Reformat signature packets for a key
  Revoke           -- Revoke a key
  Session          -- Generate a new session key object
  Sign             -- Sign a message (OpenPGP)
  Verify           -- Verify a signed message (OpenPGP)
  Modern Keygen    -- Generate keys (Ed25519, ML-DSA, ML-KEM, etc.)
  Modern Hash      -- Hash data (SHA-2, SHA-3, BLAKE2b, BLAKE3)
  Modern Encrypt   -- Encrypt (XChaCha20, AES-GCM, AES-GCM-SIV)
  Modern Sign      -- Sign/verify (Ed25519, ECDSA, Schnorr, ML-DSA)
  Password Hash    -- Hash/verify passwords (Argon2id/i/d)
  Help             -- Get help on a command
```

Use arrow keys to navigate, then press Enter to select a command.

---

## Commands

### Legacy Commands (OpenPGP)

| Command    | Description                                                    |
| ---------- | -------------------------------------------------------------- |
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
| ---------------- | ----------------------------------------------------------- |
| `Modern Keygen`  | Generate key pairs for 12 algorithms including post-quantum |
| `Modern Hash`    | Hash data with 7 algorithms (SHA-2, SHA-3, BLAKE)           |
| `Modern Encrypt` | Encrypt/decrypt with 5 AEAD ciphers                         |
| `Modern Sign`    | Sign and verify with 8 algorithms including ML-DSA          |
| `Password Hash`  | Hash and verify passwords with 3 Argon2 variants            |

---

## Modern Command Details

### Keygen

Generate key pairs for any of 12 supported algorithms. Each key pair is returned with an algorithm identifier, key ID, and public/private keys in hex or JSON format.

| Algorithm     | Type             | Use            |
| ------------- | ---------------- | -------------- |
| `ed25519`     | Edwards curve    | Signing        |
| `x25519`      | Montgomery curve | Key exchange   |
| `ed448`       | Edwards curve    | Signing        |
| `x448`        | Montgomery curve | Key exchange   |
| `p256`        | NIST curve       | Signing / ECDH |
| `p384`        | NIST curve       | Signing / ECDH |
| `ml-kem-512`  | Post-quantum KEM | Encryption     |
| `ml-kem-768`  | Post-quantum KEM | Encryption     |
| `ml-kem-1024` | Post-quantum KEM | Encryption     |
| `ml-dsa-44`   | Post-quantum DSA | Signing        |
| `ml-dsa-65`   | Post-quantum DSA | Signing        |
| `ml-dsa-87`   | Post-quantum DSA | Signing        |

**Options:** algorithm, key ID (auto-generated if empty), key usage (`sig` or `enc`), output format (`json` or `hex`).

### Hash

Hash arbitrary data with one of 7 supported algorithms.

| Algorithm  | Digest size |
| ---------- | ----------- |
| `sha256`   | 256-bit     |
| `sha384`   | 384-bit     |
| `sha512`   | 512-bit     |
| `sha3-256` | 256-bit     |
| `sha3-512` | 512-bit     |
| `blake2b`  | 512-bit     |
| `blake3`   | 256-bit     |

**Options:** algorithm, data to hash, output format (`json` or `plain`).

### Encrypt

Encrypt plaintext with one of 5 AEAD ciphers. Requires a 32-byte hex key (64 hex characters).

| Algorithm            | Notes                               |
| -------------------- | ----------------------------------- |
| `xchacha20-poly1305` | 24-byte nonce, recommended default  |
| `aes-256-gcm`        | 12-byte nonce, hardware-accelerated |
| `aes-128-gcm`        | 12-byte nonce, 128-bit key          |
| `aes-256-gcm-siv`    | Nonce-misuse resistant              |
| `aes-128-gcm-siv`    | Nonce-misuse resistant, 128-bit key |

**Options:** algorithm, encryption key (hex), plaintext, output format (`json` or `hex`).

### Sign

Sign and verify messages with one of 8 algorithms. Three actions are
available: generate a key pair and sign, sign with an existing key,
or verify a signature.

| Algorithm    | Type                  |
| ------------ | --------------------- |
| `ed25519`    | Edwards curve         |
| `ed448`      | Edwards curve         |
| `ecdsa-p256` | NIST P-256            |
| `ecdsa-p384` | NIST P-384            |
| `schnorr`    | BIP-340 (secp256k1)   |
| `ml-dsa-44`  | Post-quantum (NIST 2) |
| `ml-dsa-65`  | Post-quantum (NIST 3) |
| `ml-dsa-87`  | Post-quantum (NIST 5) |

**Actions:**

1. **Generate key pair + sign** -- creates a fresh key pair, signs the message, and outputs both keys and signature.
2. **Sign with existing key** -- prompts for a private key in hex, then signs.
3. **Verify signature** -- prompts for a public key and signature in hex, then verifies.

### Password Hash

Hash and verify passwords using Argon2, the winner of the Password Hashing Competition. Output is in PHC string format (`$argon2id$v=19$m=65536,t=3,p=4$...`).

| Variant    | Description                      |
| ---------- | -------------------------------- |
| `argon2id` | Recommended -- hybrid resistance |
| `argon2i`  | Side-channel resistant           |
| `argon2d`  | GPU resistant                    |

**Actions:**

1. **Hash password** -- returns the PHC string, raw hash, salt, and parameters.
2. **Verify password** -- checks a password against a PHC string.

---

## Examples

Runnable shell scripts are provided in the [`examples/`](./examples/) directory:

| File                                    | Purpose                                   |
| --------------------------------------- | ----------------------------------------- |
| [`keygen.sh`](./examples/keygen.sh)     | Generate Ed25519, P-256, and ML-KEM keys  |
| [`hash.sh`](./examples/hash.sh)         | Hash data with various algorithms         |
| [`encrypt.sh`](./examples/encrypt.sh)   | Encrypt and decrypt with modern ciphers   |
| [`sign.sh`](./examples/sign.sh)         | Sign and verify with modern algorithms    |
| [`password.sh`](./examples/password.sh) | Hash and verify passwords with Argon2     |
| [`legacy.sh`](./examples/legacy.sh)     | Legacy OpenPGP key generation and signing |

Run any example:

```bash
bash examples/keygen.sh
```

---

## Configuration

The CLI respects the following environment variables:

| Variable             | Default      | Description                               |
| -------------------- | ------------ | ----------------------------------------- |
| `CRYPTO_KEY_DIR`     | `./keys`     | Directory for reading key files           |
| `CRYPTO_DATA_DIR`    | `./data`     | Directory for reading data files          |
| `CRYPTO_KEY_OUT_DIR` | `./keys/out` | Directory for writing generated key files |

Example:

```bash
export CRYPTO_KEY_DIR="$HOME/.crypto/keys"
export CRYPTO_DATA_DIR="$HOME/.crypto/data"
export CRYPTO_KEY_OUT_DIR="$HOME/.crypto/keys/out"
cryptocli
```

---

## Security

- **Key material** is never logged to the console by default. Legacy commands suppress passphrase and private key output.
- **Argon2** parameters use secure defaults: 64 MiB memory, 3 iterations, 4 lanes.
- **Post-quantum algorithms** (ML-KEM, ML-DSA) follow the NIST FIPS 203/204 specifications.
- **AEAD ciphers** generate random nonces per encryption; `AES-GCM-SIV` provides nonce-misuse resistance.
- **Timing-safe comparisons** are used for all signature and password verification.

If you discover a security vulnerability, please report it privately via [GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories/new).

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

<p align="right"><a href="#contents">Back to Top</a></p>
