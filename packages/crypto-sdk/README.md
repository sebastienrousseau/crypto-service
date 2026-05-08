<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-sdk-logo.svg" alt="crypto-sdk" width="128" />
</p>

<h1 align="center">crypto-sdk</h1>

<p align="center">
  A zero-dependency, typed HTTP client for the Crypto Service REST API, with full post-quantum support.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-sdk"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-sdk?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License MIT" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

- [Install](#install) — add the SDK to your project
- [Quick Start](#quick-start) — create a client and hash data in four lines
- [API Reference](#api-reference) — full reference of every client method
- [Examples](#examples) — runnable scripts for every feature
- [Security](#security) — guarantees and responsible disclosure
- [License](#license) — Apache-2.0 OR MIT

---

## Install

**npm / pnpm**

```bash
npm install @sebastienrousseau/crypto-sdk
# or
pnpm add @sebastienrousseau/crypto-sdk
```

**From source**

```bash
git clone https://github.com/sebastienrousseau/crypto-service.git
cd crypto-service
pnpm install
pnpm --filter @sebastienrousseau/crypto-sdk build
```

Requires **Node >= 22** or any environment with a global `fetch` (browsers, Deno, Bun).

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
| -------- | ------------------------------- | ---------------- |
| `apiKey` | `x-api-key: <value>`            | Static API key   |
| `token`  | `Authorization: Bearer <value>` | JWT bearer token |

```ts
const client = new CryptoClient({
  baseUrl: "http://localhost:3000",
  apiKey: process.env.CRYPTO_API_KEY,
});
```

You can also supply a custom `fetch` implementation via the `fetch` option.

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

## API Reference

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

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/` directory. Each requires the crypto-server running on `http://localhost:3000` (override via `CRYPTO_SERVER_URL`).

```bash
npx ts-node examples/hash.ts
```

| Category     | Example                                 | Purpose                                           |
| ------------ | --------------------------------------- | ------------------------------------------------- |
| Algorithms   | [algorithms.ts](examples/algorithms.ts) | List all supported algorithms                     |
| Encryption   | [encrypt.ts](examples/encrypt.ts)       | AES-256-GCM encrypt and decrypt                   |
| Hashing      | [hash.ts](examples/hash.ts)             | Compute SHA-256 and BLAKE2b digests               |
| KDF          | [kdf.ts](examples/kdf.ts)               | Key derivation with HKDF-SHA256                   |
| Key Gen      | [keygen.ts](examples/keygen.ts)         | Generate key pairs for multiple algorithms        |
| Key Wrap     | [keywrap.ts](examples/keywrap.ts)       | AES key wrapping and unwrapping                   |
| MAC          | [mac.ts](examples/mac.ts)               | HMAC-SHA256 compute and verify                    |
| Passwords    | [password.ts](examples/password.ts)     | Argon2 hashing, verification, password encryption |
| PQ KEM       | [pqkem.ts](examples/pqkem.ts)           | Hybrid X25519 + ML-KEM key exchange               |
| PQ Sign      | [pqsign.ts](examples/pqsign.ts)         | ML-DSA post-quantum signing                       |
| PQ Hash Sign | [pqhashsign.ts](examples/pqhashsign.ts) | SLH-DSA post-quantum hash-based signing           |
| Sealed Box   | [sealedbox.ts](examples/sealedbox.ts)   | Anonymous public-key encryption                   |
| Secretbox    | [secretbox.ts](examples/secretbox.ts)   | Symmetric authenticated encryption                |
| Signing      | [sign.ts](examples/sign.ts)             | Ed25519 signing and verification                  |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

**Zero dependencies.** The SDK has no runtime dependencies -- it uses the global `fetch` API available in Node >= 22, browsers, Deno, and Bun.

**Typed responses.** Every method returns strongly-typed responses. Failures throw `CryptoApiError` with the HTTP status code and server error body, never silently swallowed.

**No ambient network access.** The client only communicates with the `baseUrl` you provide. No telemetry, no analytics, no phone-home.

**Responsible disclosure.** Report vulnerabilities via [GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service Suite contributors.

<p align="right"><a href="#contents">Back to Top</a></p>
