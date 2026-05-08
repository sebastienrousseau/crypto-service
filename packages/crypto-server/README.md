<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-server-logo.svg" alt="crypto-server" width="128" />
</p>

<h1 align="center">crypto-server</h1>

<p align="center">
  A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-server"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-server?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License MIT" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

- [Install](#install) — add the package and configure environment variables
- [Quick Start](#quick-start) — launch the server and make your first request
- [Architecture](#architecture) — Fastify, route versioning, and middleware stack
- [API Routes](#api-routes) — complete table of all v2 endpoints
- [Authentication](#authentication) — API key and JWT bearer token support
- [Configuration](#configuration) — environment variables reference
- [Examples](#examples) — runnable TypeScript examples
- [Security](#security) — responsible disclosure and hardening notes
- [License](#license) — Apache-2.0 OR MIT

---

## Install

**npm / pnpm**

```bash
npm install @sebastienrousseau/crypto-server
# or
pnpm add @sebastienrousseau/crypto-server
```

**From source**

```bash
git clone https://github.com/sebastienrousseau/crypto-service.git
cd crypto-service
pnpm install
pnpm --filter @sebastienrousseau/crypto-server build
```

Set the following environment variables before starting the server:

```bash
export PORT=3000
export CRYPTO_API_KEY="your-secret-api-key"
export LOG_LEVEL="info"
```

Requires **Node >= 22**.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Quick Start

Start the server:

```bash
npx crypto-server
# or, from a clone of this repo:
pnpm --filter @sebastienrousseau/crypto-server start
```

Hash some data:

```bash
curl -s -X POST http://localhost:3000/v2/hash \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key" \
  -d '{"algorithm":"sha256","data":"Hello, world!"}' | jq
```

```json
{
  "data": "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3"
}
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Architecture

Crypto Server is built on **Fastify 4.x** with a layered middleware stack:

```
Request
  -> @fastify/helmet (security headers)
  -> @fastify/cors
  -> @fastify/rate-limit
  -> @fastify/compress
  -> Authentication (x-api-key / JWT Bearer)
  -> Route handler
  -> Response
```

### Route versioning

| Prefix                        | Status         | Notes                                                                         |
| ----------------------------- | -------------- | ----------------------------------------------------------------------------- |
| `/v1/*`                       | **Deprecated** | Legacy PGP-based endpoints. Emit `Deprecation`, `Sunset`, and `Link` headers. |
| `/v2/*`                       | **Current**    | Modern endpoints using `@noble/*` primitives and post-quantum algorithms.     |
| `/live`, `/ready`, `/metrics` | Stable         | Infrastructure probes (no auth required).                                     |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## API Routes

All v2 endpoints accept and return `application/json`. Authenticated requests must include an `x-api-key` header (or `Authorization: Bearer <jwt>`).

### Hash

| Method | Path       | Description                                                  |
| ------ | ---------- | ------------------------------------------------------------ |
| `POST` | `/v2/hash` | Compute a cryptographic hash (SHA-2, SHA-3, BLAKE2b, BLAKE3) |

### Encrypt

| Method | Path          | Description                             |
| ------ | ------------- | --------------------------------------- |
| `POST` | `/v2/encrypt` | AEAD encryption with XChaCha20-Poly1305 |
| `POST` | `/v2/decrypt` | AEAD decryption with XChaCha20-Poly1305 |

### Sign

| Method | Path         | Description                         |
| ------ | ------------ | ----------------------------------- |
| `POST` | `/v2/sign`   | Create an Ed25519 digital signature |
| `POST` | `/v2/verify` | Verify an Ed25519 signature         |

### KDF

| Method | Path      | Description                                       |
| ------ | --------- | ------------------------------------------------- |
| `POST` | `/v2/kdf` | Derive a key (scrypt, HKDF-SHA256, PBKDF2-SHA256) |

### MAC

| Method | Path              | Description                                     |
| ------ | ----------------- | ----------------------------------------------- |
| `POST` | `/v2/hmac`        | Compute an HMAC (SHA-256/384/512, SHA3-256/512) |
| `POST` | `/v2/hmac/verify` | Verify an HMAC in constant time                 |

### Password

| Method | Path                  | Description                                |
| ------ | --------------------- | ------------------------------------------ |
| `POST` | `/v2/password/hash`   | Hash a password with Argon2id              |
| `POST` | `/v2/password/verify` | Verify a password against an Argon2id hash |

### PQ KEM

| Method | Path                        | Description                                    |
| ------ | --------------------------- | ---------------------------------------------- |
| `POST` | `/v2/pq/keygen`             | Generate an ML-KEM-768 key pair (FIPS 203)     |
| `POST` | `/v2/pq/encapsulate`        | Encapsulate a shared secret with ML-KEM-768    |
| `POST` | `/v2/pq/decapsulate`        | Decapsulate and recover the shared secret      |
| `POST` | `/v2/pq/hybrid/keygen`      | Generate a hybrid X25519 + ML-KEM-768 key pair |
| `POST` | `/v2/pq/hybrid/encapsulate` | Hybrid encapsulation (X25519 + ML-KEM-768)     |
| `POST` | `/v2/pq/hybrid/decapsulate` | Hybrid decapsulation                           |

### PQ Sign

| Method | Path                | Description                            |
| ------ | ------------------- | -------------------------------------- |
| `POST` | `/v2/pq/dsa/keygen` | Generate an ML-DSA key pair (FIPS 204) |
| `POST` | `/v2/pq/dsa/sign`   | Sign with ML-DSA                       |
| `POST` | `/v2/pq/dsa/verify` | Verify an ML-DSA signature             |

### PQ Hash Sign

| Method | Path                    | Description                             |
| ------ | ----------------------- | --------------------------------------- |
| `POST` | `/v2/pq/slh-dsa/keygen` | Generate an SLH-DSA key pair (FIPS 205) |
| `POST` | `/v2/pq/slh-dsa/sign`   | Sign with SLH-DSA                       |
| `POST` | `/v2/pq/slh-dsa/verify` | Verify an SLH-DSA signature             |

### Keys

| Method | Path                | Description                                     |
| ------ | ------------------- | ----------------------------------------------- |
| `POST` | `/v2/keys/generate` | Generate a key pair for any supported algorithm |

### Secretbox

| Method | Path                 | Description                                 |
| ------ | -------------------- | ------------------------------------------- |
| `POST` | `/v2/secretbox/seal` | Encrypt with XChaCha20-Poly1305 (secretbox) |
| `POST` | `/v2/secretbox/open` | Decrypt a secretbox ciphertext              |

### Sealedbox

| Method | Path                    | Description                                   |
| ------ | ----------------------- | --------------------------------------------- |
| `POST` | `/v2/sealedbox/seal`    | Anonymous public-key encryption (X25519)      |
| `POST` | `/v2/sealedbox/open`    | Decrypt an anonymous sealed box               |
| `POST` | `/v2/sealedbox/seal-pq` | Post-quantum sealed box (X25519 + ML-KEM-768) |
| `POST` | `/v2/sealedbox/open-pq` | Decrypt a post-quantum sealed box             |

### Password Encrypt

| Method | Path                   | Description                                           |
| ------ | ---------------------- | ----------------------------------------------------- |
| `POST` | `/v2/password/encrypt` | Encrypt with password (Argon2id + XChaCha20-Poly1305) |
| `POST` | `/v2/password/decrypt` | Decrypt with password                                 |

### Key Wrap

| Method | Path              | Description                                       |
| ------ | ----------------- | ------------------------------------------------- |
| `POST` | `/v2/keys/wrap`   | Wrap a key with AES-KW or AES-KWP (RFC 3394/5649) |
| `POST` | `/v2/keys/unwrap` | Unwrap a key                                      |

### Multi-Recipient

| Method | Path                          | Description                                           |
| ------ | ----------------------------- | ----------------------------------------------------- |
| `POST` | `/v2/multi-recipient/encrypt` | Encrypt for multiple recipients (hybrid key wrapping) |

### Algorithms

| Method | Path             | Description                   |
| ------ | ---------------- | ----------------------------- |
| `GET`  | `/v2/algorithms` | List all supported algorithms |

### Probes

| Method | Path       | Description                   |
| ------ | ---------- | ----------------------------- |
| `GET`  | `/live`    | Liveness probe (Kubernetes)   |
| `GET`  | `/ready`   | Readiness probe (Kubernetes)  |
| `GET`  | `/metrics` | Prometheus-compatible metrics |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Authentication

The server supports two authentication modes:

1. **API Key** -- set `CRYPTO_API_KEY` and pass it as the `x-api-key` header.
2. **JWT Bearer** -- set `JWT_SECRET` and pass `Authorization: Bearer <token>`.

If neither variable is set, all requests are allowed (development mode).

```bash
# API key
curl -H "x-api-key: your-secret-api-key" ...

# JWT Bearer
curl -H "Authorization: Bearer eyJhbGciOi..." ...
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Configuration

| Variable              | Default       | Description                                        |
| --------------------- | ------------- | -------------------------------------------------- |
| `PORT`                | `3000`        | TCP port to listen on                              |
| `HOST`                | `localhost`   | Bind address                                       |
| `PROTOCOL`            | `http`        | `http` or `https`                                  |
| `NODE_ENV`            | `development` | `development`, `production`, or `test`             |
| `LOG_LEVEL`           | `info`        | `error`, `warn`, `info`, or `debug`                |
| `CRYPTO_API_KEY`      | --            | Static API key for `x-api-key` authentication      |
| `JWT_SECRET`          | --            | HMAC secret for HS256 JWT validation               |
| `CORS_ORIGIN`         | --            | Comma-separated allowed origins (empty = disabled) |
| `TRUSTED_PROXY_CIDRS` | --            | Comma-separated trusted proxy CIDRs                |
| `CRYPTO_KEY_DIR`      | --            | Directory for key storage                          |
| `CRYPTO_KEY_OUT_DIR`  | --            | Directory for key output                           |
| `SHUTDOWN_TIMEOUT_MS` | `30000`       | Graceful shutdown timeout in milliseconds          |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/` directory. Each uses `fetch` to call the server. Run any example with:

```bash
# Start the server in one terminal:
pnpm --filter @sebastienrousseau/crypto-server start

# Run an example in another:
npx ts-node examples/<name>.ts
```

| Category        | Example                                         | Purpose                                  |
| --------------- | ----------------------------------------------- | ---------------------------------------- |
| Algorithms      | [algorithms.ts](examples/algorithms.ts)         | List supported algorithms                |
| Encryption      | [encrypt.ts](examples/encrypt.ts)               | Encrypt and decrypt via v2 endpoints     |
| Hashing         | [hash.ts](examples/hash.ts)                     | Hash data via POST /v2/hash              |
| HMAC            | [hmac.ts](examples/hmac.ts)                     | HMAC compute and verify                  |
| KDF             | [kdf.ts](examples/kdf.ts)                       | Key derivation                           |
| Key Generation  | [keygen.ts](examples/keygen.ts)                 | Generate keys via POST /v2/keys/generate |
| Key Wrap        | [keywrap.ts](examples/keywrap.ts)               | AES key wrapping and unwrapping          |
| Passwords       | [password.ts](examples/password.ts)             | Password hash and verify                 |
| PW Encrypt      | [pwencrypt.ts](examples/pwencrypt.ts)           | Password-based encryption and decryption |
| PQ KEM          | [pqkem.ts](examples/pqkem.ts)                   | Post-quantum KEM operations              |
| PQ Sign         | [pqsign.ts](examples/pqsign.ts)                 | Post-quantum ML-DSA signing              |
| PQ Hash Sign    | [pqhashsign.ts](examples/pqhashsign.ts)         | Post-quantum SLH-DSA signing             |
| Probes          | [probes.ts](examples/probes.ts)                 | Health and readiness checks              |
| Multi-Recipient | [multirecipient.ts](examples/multirecipient.ts) | Multi-recipient encryption               |
| Sealed Box      | [sealedbox.ts](examples/sealedbox.ts)           | Sealed box operations                    |
| Secretbox       | [secretbox.ts](examples/secretbox.ts)           | Secretbox seal and open                  |
| Signing         | [sign.ts](examples/sign.ts)                     | Sign and verify via v2 endpoints         |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

The server applies the following hardening measures by default:

**Rate limiting** via `@fastify/rate-limit`.

**Security headers** via `@fastify/helmet` (CSP, HSTS, X-Frame-Options, etc.).

**Timing-safe comparison** for API key validation.

**Input validation** via JSON Schema on every route.

**No secrets in logs.** Request bodies are never logged.

**Responsible disclosure.** Report vulnerabilities via [GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service Suite contributors.

<p align="right"><a href="#contents">Back to Top</a></p>
