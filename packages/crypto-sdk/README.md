<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->
<!-- Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved. -->

<div align="center">

![Crypto SDK logo](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-sdk-logo.svg)

# Crypto SDK

A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.

[![Build](https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?style=for-the-badge&branch=main)](https://github.com/sebastienrousseau/crypto-service/actions)
[![npm](https://img.shields.io/npm/v/@sebastienrousseau/crypto-sdk.svg?style=for-the-badge)](https://www.npmjs.com/package/@sebastienrousseau/crypto-sdk)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge)](https://github.com/sebastienrousseau/crypto-service)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D22-green.svg?style=for-the-badge)](https://nodejs.org/)

**[Website](https://crypto-service.co)
&middot; [Documentation](https://crypto-service.co/docs/)
&middot; [Submit an Issue](https://github.com/sebastienrousseau/crypto-service/issues)
&middot; [Contributing Guidelines](https://github.com/sebastienrousseau/crypto-service/blob/main/.github/CONTRIBUTING.md)**

</div>

---

## Contents

- [Install](#install) &mdash; Add the SDK to your project
- [Quick Start](#quick-start) &mdash; Create a client and hash data in four lines
- [Authentication](#authentication) &mdash; API key and JWT token options
- [API Methods](#api-methods) &mdash; Full reference of every client method
- [Error Handling](#error-handling) &mdash; Working with `CryptoApiError`
- [Examples](#examples) &mdash; Runnable scripts for every feature
- [License](#license) &mdash; MIT

---

## Install

```bash
# npm
npm install @sebastienrousseau/crypto-sdk

# yarn
yarn add @sebastienrousseau/crypto-sdk

# pnpm
pnpm add @sebastienrousseau/crypto-sdk
```

> **Requirements:** Node >= 22 or any environment with a global `fetch` (browsers, Deno, Bun).

---

## Quick Start

```ts
import { CryptoClient } from "@sebastienrousseau/crypto-sdk";

const client = new CryptoClient({
  baseUrl: "http://localhost:3000",
});

const { data } = await client.hash({ algorithm: "sha256", data: "hello" });
console.log(data.digest);
```

---

## Authentication

`CryptoClient` accepts two optional authentication mechanisms:

| Option   | Header sent                     | Description      |
| -------- | ------------------------------- | ---------------- |
| `apiKey` | `x-api-key: <value>`            | Static API key   |
| `token`  | `Authorization: Bearer <value>` | JWT bearer token |

```ts
const client = new CryptoClient({
  baseUrl: "http://localhost:3000",
  apiKey: process.env.CRYPTO_API_KEY,
});

// or with a JWT token
const client2 = new CryptoClient({
  baseUrl: "http://localhost:3000",
  token: "eyJhbGciOiJIUzI1NiIs...",
});
```

You can also supply a custom `fetch` implementation via the `fetch` option.

---

## API Methods

Every method returns `Promise<ApiResponse<T>>` where `ApiResponse<T>` is `{ data: T }`.

### Hashing

| Method       | Endpoint        | Description                                                    |
| ------------ | --------------- | -------------------------------------------------------------- |
| `hash(body)` | `POST /v2/hash` | Compute a cryptographic hash (SHA-256, SHA-512, BLAKE2b, etc.) |

### Encryption / Decryption

| Method          | Endpoint           | Description                        |
| --------------- | ------------------ | ---------------------------------- |
| `encrypt(body)` | `POST /v2/encrypt` | Encrypt plaintext with AES-256-GCM |
| `decrypt(body)` | `POST /v2/decrypt` | Decrypt ciphertext                 |

### Signing / Verification

| Method         | Endpoint          | Description                                    |
| -------------- | ----------------- | ---------------------------------------------- |
| `sign(body)`   | `POST /v2/sign`   | Sign a message (Ed25519, ECDSA, Schnorr, etc.) |
| `verify(body)` | `POST /v2/verify` | Verify a signature                             |

### Key Derivation

| Method      | Endpoint       | Description                         |
| ----------- | -------------- | ----------------------------------- |
| `kdf(body)` | `POST /v2/kdf` | Derive a key (HKDF, PBKDF2, scrypt) |

### MAC

| Method            | Endpoint               | Description                |
| ----------------- | ---------------------- | -------------------------- |
| `mac(body)`       | `POST /v2/mac/compute` | Compute a MAC (HMAC, KMAC) |
| `macVerify(body)` | `POST /v2/mac/verify`  | Verify a MAC               |

### Password Hashing

| Method                 | Endpoint                   | Description                 |
| ---------------------- | -------------------------- | --------------------------- |
| `passwordHash(body)`   | `POST /v2/password/hash`   | Hash a password with Argon2 |
| `passwordVerify(body)` | `POST /v2/password/verify` | Verify a password hash      |

### Password Encryption

| Method                  | Endpoint                    | Description                     |
| ----------------------- | --------------------------- | ------------------------------- |
| `passwordEncrypt(body)` | `POST /v2/password/encrypt` | Encrypt data with a password    |
| `passwordDecrypt(body)` | `POST /v2/password/decrypt` | Decrypt password-encrypted data |

### Key Management

| Method                   | Endpoint                 | Description                                |
| ------------------------ | ------------------------ | ------------------------------------------ |
| `generateKeyPair(body?)` | `POST /v2/keys/generate` | Generate a key pair (Ed25519, ECDSA, etc.) |
| `keyWrap(body)`          | `POST /v2/keys/wrap`     | Wrap a key with AES-KW / AES-KWP           |
| `keyUnwrap(body)`        | `POST /v2/keys/unwrap`   | Unwrap a wrapped key                       |

### Secretbox (Symmetric Authenticated Encryption)

| Method                | Endpoint                  | Description                         |
| --------------------- | ------------------------- | ----------------------------------- |
| `secretboxSeal(body)` | `POST /v2/secretbox/seal` | Seal plaintext with a symmetric key |
| `secretboxOpen(body)` | `POST /v2/secretbox/open` | Open a sealed secretbox             |

### Sealed Box (Asymmetric Authenticated Encryption)

| Method                | Endpoint                  | Description                                     |
| --------------------- | ------------------------- | ----------------------------------------------- |
| `sealedboxSeal(body)` | `POST /v2/sealedbox/seal` | Seal plaintext for a recipient public key       |
| `sealedboxOpen(body)` | `POST /v2/sealedbox/open` | Open a sealed box with the recipient secret key |

### Post-Quantum KEM (Hybrid X25519 + ML-KEM)

| Method                | Endpoint                         | Description                                |
| --------------------- | -------------------------------- | ------------------------------------------ |
| `pqGenerateKeyPair()` | `POST /v2/pq/hybrid/keygen`      | Generate a hybrid X25519 + ML-KEM key pair |
| `pqEncapsulate(body)` | `POST /v2/pq/hybrid/encapsulate` | Encapsulate a shared secret                |
| `pqDecapsulate(body)` | `POST /v2/pq/hybrid/decapsulate` | Decapsulate a shared secret                |

### Post-Quantum Signatures (ML-DSA)

| Method               | Endpoint                 | Description                                       |
| -------------------- | ------------------------ | ------------------------------------------------- |
| `pqSignKeygen(body)` | `POST /v2/pq/dsa/keygen` | Generate an ML-DSA key pair (level 44, 65, or 87) |
| `pqSign(body)`       | `POST /v2/pq/dsa/sign`   | Sign a message with ML-DSA                        |
| `pqVerify(body)`     | `POST /v2/pq/dsa/verify` | Verify an ML-DSA signature                        |

### Post-Quantum Hash-Based Signatures (SLH-DSA)

| Method                   | Endpoint                       | Description                  |
| ------------------------ | ------------------------------ | ---------------------------- |
| `pqHashSignKeygen(body)` | `POST /v2/pq/hash-sign/keygen` | Generate an SLH-DSA key pair |
| `pqHashSign(body)`       | `POST /v2/pq/hash-sign/sign`   | Sign a message with SLH-DSA  |
| `pqHashVerify(body)`     | `POST /v2/pq/hash-sign/verify` | Verify an SLH-DSA signature  |

### Utility

| Method         | Endpoint             | Description                   |
| -------------- | -------------------- | ----------------------------- |
| `algorithms()` | `GET /v2/algorithms` | List all supported algorithms |
| `health()`     | `GET /health`        | Server health check           |

---

## Error Handling

Failed requests throw a `CryptoApiError`:

```ts
import { CryptoClient, CryptoApiError } from "@sebastienrousseau/crypto-sdk";

const client = new CryptoClient({ baseUrl: "http://localhost:3000" });

try {
  await client.hash({ algorithm: "invalid", data: "test" });
} catch (err) {
  if (err instanceof CryptoApiError) {
    console.error(err.status); // HTTP status code (e.g. 400)
    console.error(err.body.error); // Error message from the server
    console.error(err.body.details); // Optional field-level validation errors
  }
}
```

The `ApiError` interface:

```ts
interface ApiError {
  error: string;
  details?: Array<{ field: string; message: string }>;
}
```

---

## Examples

Runnable TypeScript examples are provided in the [`examples/`](./examples/) directory. Each requires the crypto-server running on `http://localhost:3000` (override via `CRYPTO_SERVER_URL`).

| Example           | File                                        | Description                                           |
| ----------------- | ------------------------------------------- | ----------------------------------------------------- |
| Hashing           | [`hash.ts`](./examples/hash.ts)             | Compute SHA-256 and BLAKE2b digests                   |
| Encrypt / Decrypt | [`encrypt.ts`](./examples/encrypt.ts)       | AES-256-GCM encrypt and decrypt                       |
| Sign / Verify     | [`sign.ts`](./examples/sign.ts)             | Ed25519 key generation, signing, and verification     |
| Password Ops      | [`password.ts`](./examples/password.ts)     | Argon2 hashing, verification, and password encryption |
| Key Generation    | [`keygen.ts`](./examples/keygen.ts)         | Generate key pairs for multiple algorithms            |
| Secretbox         | [`secretbox.ts`](./examples/secretbox.ts)   | Symmetric authenticated encryption                    |
| PQ KEM            | [`pqkem.ts`](./examples/pqkem.ts)           | Hybrid X25519 + ML-KEM key exchange                   |
| PQ Signing        | [`pqsign.ts`](./examples/pqsign.ts)         | ML-DSA post-quantum signing                           |
| Algorithms        | [`algorithms.ts`](./examples/algorithms.ts) | List all supported algorithms                         |

```bash
npx ts-node examples/hash.ts
```

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

<p align="right"><a href="#contents">Back to Top</a></p>
