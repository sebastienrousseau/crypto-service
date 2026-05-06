<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

<div align="center">

<img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-server-logo.svg" alt="Crypto Server logo" width="261" />

# Crypto Server

A hardened Fastify REST API for cryptographic operations, with rate limiting, OpenAPI schemas, and post-quantum endpoints.

[![Build](https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github)](https://github.com/sebastienrousseau/crypto-service/actions)
[![npm](https://img.shields.io/npm/v/@sebastienrousseau/crypto-server.svg?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@sebastienrousseau/crypto-server)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge&logo=codecov)](https://github.com/sebastienrousseau/crypto-service)
[![License](https://img.shields.io/badge/license-MIT%2FApache--2.0-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/node/v/@sebastienrousseau/crypto-server?style=for-the-badge&logo=node.js)](https://nodejs.org/)

</div>

---

## Contents

- [Install](#install) — add the package and configure environment variables
- [Quick Start](#quick-start) — launch the server and make your first request
- [Architecture](#architecture) — Fastify, route versioning, and middleware stack
- [API Reference](#api-reference) — complete table of all v2 endpoints
- [Authentication](#authentication) — API key and JWT bearer token support
- [Configuration](#configuration) — environment variables reference
- [Examples](#examples) — runnable TypeScript examples
- [Security](#security) — responsible disclosure and hardening notes
- [License](#license) — MIT OR Apache-2.0

---

## Install

```bash
npm install @sebastienrousseau/crypto-server
# or
pnpm add @sebastienrousseau/crypto-server
```

Set the following environment variables before starting the server:

```bash
export PORT=3000
export CRYPTO_API_KEY="your-secret-api-key"
export LOG_LEVEL="info"
```

> **Node >= 22** is required.

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

---

## API Reference

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

---

## Examples

Runnable TypeScript examples are provided in the [`examples/`](./examples/) directory. Each file is self-contained and uses `fetch` to call the server.

| File                                        | Purpose                                  |
| ------------------------------------------- | ---------------------------------------- |
| [`hash.ts`](./examples/hash.ts)             | Hash data via POST /v2/hash              |
| [`encrypt.ts`](./examples/encrypt.ts)       | Encrypt and decrypt via v2 endpoints     |
| [`sign.ts`](./examples/sign.ts)             | Sign and verify via v2 endpoints         |
| [`password.ts`](./examples/password.ts)     | Password hash and verify                 |
| [`keygen.ts`](./examples/keygen.ts)         | Generate keys via POST /v2/keys/generate |
| [`secretbox.ts`](./examples/secretbox.ts)   | Secretbox seal and open                  |
| [`sealedbox.ts`](./examples/sealedbox.ts)   | Sealed box operations                    |
| [`pqkem.ts`](./examples/pqkem.ts)           | Post-quantum KEM operations              |
| [`pqsign.ts`](./examples/pqsign.ts)         | Post-quantum signing                     |
| [`hmac.ts`](./examples/hmac.ts)             | HMAC compute and verify                  |
| [`kdf.ts`](./examples/kdf.ts)               | Key derivation                           |
| [`algorithms.ts`](./examples/algorithms.ts) | List supported algorithms                |
| [`probes.ts`](./examples/probes.ts)         | Health and readiness checks              |

```bash
# Start the server in one terminal:
pnpm --filter @sebastienrousseau/crypto-server start

# Run an example in another:
npx ts-node examples/hash.ts
```

---

## Security

If you discover a security vulnerability, please report it responsibly by emailing **sebastienrousseau@users.noreply.github.com** rather than opening a public issue.

The server applies the following hardening measures by default:

- **Rate limiting** via `@fastify/rate-limit`
- **Security headers** via `@fastify/helmet` (CSP, HSTS, X-Frame-Options, etc.)
- **Timing-safe comparison** for API key validation
- **Input validation** via JSON Schema on every route
- **No secrets in logs** -- request bodies are never logged

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

<p align="right"><a href="#contents">Back to Top</a></p>
