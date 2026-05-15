<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-sdk-logo.svg" alt="crypto-sdk logo" width="128" />
</p>

<h1 align="center">crypto-sdk</h1>

<p align="center">
  A zero-dependency, typed HTTP client for the Crypto Service REST
  API, with full post-quantum support.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-sdk"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-sdk?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT%2FApache--2.0-blue?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

**Getting started**

- [Install](#install) -- npm, pnpm, source
- [Quick Start](#quick-start) -- create a client and hash data in four lines

**SDK reference**

- [Overview](#overview) -- what crypto-sdk does and why
- [API Reference](#api-reference) -- full reference of every client method
- [Examples](#examples) -- runnable scripts for every feature

**Operational**

- [Security](#security) -- guarantees and responsible disclosure
- [Documentation](#documentation) -- API reference
- [Contributing](#contributing) -- how to get involved
- [License](#license)

---

## Install

```bash
pnpm add @sebastienrousseau/crypto-sdk
# or
npm install @sebastienrousseau/crypto-sdk
```

### From source

```bash
git clone https://github.com/sebastienrousseau/crypto-service.git
cd crypto-service
pnpm install
pnpm --filter @sebastienrousseau/crypto-sdk build
```

Requires **Node >= 22** or any environment with a global `fetch`
(browsers, Deno, Bun).

<p align="right"><a href="#contents">Back to Top</a></p>

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

`CryptoClient` accepts two optional authentication mechanisms:

| Option   | Header sent                     | Description      |
| :------- | :------------------------------ | :--------------- |
| `apiKey` | `x-api-key: <value>`            | Static API key   |
| `token`  | `Authorization: Bearer <value>` | JWT bearer token |

Failed requests throw a `CryptoApiError`:

```ts
import { CryptoClient, CryptoApiError } from "@sebastienrousseau/crypto-sdk";

try {
  await client.hash({ algorithm: "invalid", data: "test" });
} catch (err) {
  if (err instanceof CryptoApiError) {
    console.error(err.status); // HTTP status code (e.g. 400)
    console.error(err.body.error); // Error message from the server
  }
}
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-sdk is a typed HTTP client that wraps the Crypto Service REST
API. It uses the global `fetch` API (no runtime dependencies) and
provides strongly-typed methods for every v2 endpoint -- hashing,
encryption, signing, key derivation, password hashing, key
management, sealed boxes, secretboxes, and post-quantum KEM and
signature operations.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## API Reference

Every method returns `Promise<ApiResponse<T>>` where
`ApiResponse<T>` is `{ data: T }`.

| Method                   | Endpoint                         | Description                               |
| :----------------------- | :------------------------------- | :---------------------------------------- |
| `hash(body)`             | `POST /v2/hash`                  | Compute a cryptographic hash              |
| `encrypt(body)`          | `POST /v2/encrypt`               | Encrypt plaintext                         |
| `decrypt(body)`          | `POST /v2/decrypt`               | Decrypt ciphertext                        |
| `sign(body)`             | `POST /v2/sign`                  | Sign a message                            |
| `verify(body)`           | `POST /v2/verify`                | Verify a signature                        |
| `kdf(body)`              | `POST /v2/kdf`                   | Derive a key                              |
| `mac(body)`              | `POST /v2/hmac`                  | Compute a MAC                             |
| `macVerify(body)`        | `POST /v2/hmac/verify`           | Verify a MAC                              |
| `passwordHash(body)`     | `POST /v2/password/hash`         | Hash a password                           |
| `passwordVerify(body)`   | `POST /v2/password/verify`       | Verify a password hash                    |
| `passwordEncrypt(body)`  | `POST /v2/password/encrypt`      | Encrypt data with a password              |
| `passwordDecrypt(body)`  | `POST /v2/password/decrypt`      | Decrypt password-encrypted data           |
| `generateKeyPair(body?)` | `POST /v2/keys/generate`         | Generate a key pair                       |
| `keyWrap(body)`          | `POST /v2/keys/wrap`             | Wrap a key                                |
| `keyUnwrap(body)`        | `POST /v2/keys/unwrap`           | Unwrap a wrapped key                      |
| `secretboxSeal(body)`    | `POST /v2/secretbox/seal`        | Seal plaintext with a symmetric key       |
| `secretboxOpen(body)`    | `POST /v2/secretbox/open`        | Open a sealed secretbox                   |
| `sealedboxSeal(body)`    | `POST /v2/sealedbox/seal`        | Seal plaintext for a recipient public key |
| `sealedboxOpen(body)`    | `POST /v2/sealedbox/open`        | Open a sealed box                         |
| `pqGenerateKeyPair()`    | `POST /v2/pq/hybrid/keygen`      | Generate a hybrid key pair                |
| `pqEncapsulate(body)`    | `POST /v2/pq/hybrid/encapsulate` | Encapsulate a shared secret               |
| `pqDecapsulate(body)`    | `POST /v2/pq/hybrid/decapsulate` | Decapsulate a shared secret               |
| `pqSignKeygen(body)`     | `POST /v2/pq/dsa/keygen`         | Generate an ML-DSA key pair               |
| `pqSign(body)`           | `POST /v2/pq/dsa/sign`           | Sign with ML-DSA                          |
| `pqVerify(body)`         | `POST /v2/pq/dsa/verify`         | Verify an ML-DSA signature                |
| `pqHashSignKeygen(body)` | `POST /v2/pq/hash-sign/keygen`   | Generate an SLH-DSA key pair              |
| `pqHashSign(body)`       | `POST /v2/pq/hash-sign/sign`     | Sign with SLH-DSA                         |
| `pqHashVerify(body)`     | `POST /v2/pq/hash-sign/verify`   | Verify an SLH-DSA signature               |
| `algorithms()`           | `GET /v2/algorithms`             | List all supported algorithms             |
| `health()`               | `GET /health`                    | Server health check                       |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Each requires the crypto-server running on
`http://localhost:3000` (override via `CRYPTO_SERVER_URL`).

```bash
npx ts-node examples/<name>.ts
```

| Category     | Example                                 | Purpose                                |
| :----------- | :-------------------------------------- | :------------------------------------- |
| Algorithms   | [algorithms.ts](examples/algorithms.ts) | List all supported algorithms          |
| Encryption   | [encrypt.ts](examples/encrypt.ts)       | AES-256-GCM encrypt and decrypt        |
| Hashing      | [hash.ts](examples/hash.ts)             | Compute SHA-256 and BLAKE2b digests    |
| KDF          | [kdf.ts](examples/kdf.ts)               | Key derivation with HKDF-SHA256        |
| Key Gen      | [keygen.ts](examples/keygen.ts)         | Generate key pairs                     |
| Key Wrap     | [keywrap.ts](examples/keywrap.ts)       | AES key wrapping and unwrapping        |
| MAC          | [mac.ts](examples/mac.ts)               | HMAC-SHA256 compute and verify         |
| Passwords    | [password.ts](examples/password.ts)     | Argon2 hashing and password encryption |
| PQ KEM       | [pqkem.ts](examples/pqkem.ts)           | Hybrid X25519 + ML-KEM key exchange    |
| PQ Sign      | [pqsign.ts](examples/pqsign.ts)         | ML-DSA post-quantum signing            |
| PQ Hash Sign | [pqhashsign.ts](examples/pqhashsign.ts) | SLH-DSA post-quantum signing           |
| Sealed Box   | [sealedbox.ts](examples/sealedbox.ts)   | Anonymous public-key encryption        |
| Secretbox    | [secretbox.ts](examples/secretbox.ts)   | Symmetric authenticated encryption     |
| Signing      | [sign.ts](examples/sign.ts)             | Ed25519 signing and verification       |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

**Zero dependencies.** The SDK has no runtime dependencies -- it
uses the global `fetch` API available in Node >= 22, browsers,
Deno, and Bun.

**Typed responses.** Every method returns strongly-typed responses.
Failures throw `CryptoApiError` with the HTTP status code and server
error body, never silently swallowed.

**No ambient network access.** The client only communicates with the
`baseUrl` you provide. No telemetry, no analytics, no phone-home.

**Responsible disclosure.** Report vulnerabilities via
[GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Documentation

API reference documentation is generated with TypeDoc. Build it
locally with:

```bash
pnpm --filter @sebastienrousseau/crypto-sdk docs
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
