<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-middleware-logo.svg" alt="crypto-middleware logo" width="128" />
</p>

<h1 align="center">crypto-middleware</h1>

<p align="center">
  Plug-and-play cryptographic middleware for Express and Fastify --
  auto-decrypt requests, verify signatures, and encrypt responses.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-middleware"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-middleware?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT%2FApache--2.0-blue?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

**Getting started**

- [Install](#install) -- npm, pnpm, peer dependencies
- [Quick Start](#quick-start) -- Express and Fastify setup in seconds

**Package reference**

- [Overview](#overview) -- what crypto-middleware does and why
- [Express](#express) -- configuration, operations, and route matching
- [Fastify](#fastify) -- plugin registration and options
- [Examples](#examples) -- runnable scripts for every feature

**Operational**

- [Security](#security) -- guarantees and threat model
- [Documentation](#documentation) -- API reference
- [Contributing](#contributing) -- how to get involved
- [License](#license)

---

## Install

```bash
pnpm add @sebastienrousseau/crypto-middleware
# or
npm install @sebastienrousseau/crypto-middleware
```

Install the framework you need as a peer dependency:

```bash
# For Express
npm install express

# For Fastify
npm install fastify fastify-plugin
```

Requires **Node >= 22**. Express >= 4 or Fastify >= 4.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Quick Start

```ts
import express from "express";
import { createCryptoMiddleware } from "@sebastienrousseau/crypto-middleware";

const app = express();
app.use(express.json());

app.use(
  createCryptoMiddleware({
    key: process.env.CRYPTO_KEY, // 256-bit hex key
    operations: ["decrypt-request", "encrypt-response"],
  }),
);

app.post("/api/data", (req, res) => {
  // req.body is already decrypted
  res.json({ received: req.body });
  // response is automatically encrypted
});

app.listen(3000);
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-middleware provides transparent cryptographic operations for
Express and Fastify applications. It can auto-decrypt incoming
request bodies, encrypt outgoing responses, verify HMAC signatures
on webhooks, and validate HS256 JWT bearer tokens -- all via a
single middleware registration. Route matching via glob patterns
lets you scope protection to specific endpoints.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Express

### Configuration

| Option       | Type       | Required | Description                                       |
| :----------- | :--------- | :------- | :------------------------------------------------ |
| `key`        | `string`   | \*       | Hex-encoded 256-bit key for encryption/decryption |
| `routes`     | `string[]` | No       | Glob patterns for routes to apply middleware to   |
| `operations` | `string[]` | No       | Operations to perform (see below)                 |
| `hmacKey`    | `string`   | \*       | Hex-encoded HMAC key for signature verification   |
| `jwtSecret`  | `string`   | \*       | Secret for HS256 JWT verification                 |

\* Required when the corresponding operation is enabled.

### Operations

| Operation          | Description                                            |
| :----------------- | :----------------------------------------------------- |
| `decrypt-request`  | Decrypts incoming JSON bodies                          |
| `encrypt-response` | Encrypts outgoing JSON responses                       |
| `verify-signature` | Verifies HMAC-SHA256 from `x-signature` header         |
| `verify-jwt`       | Verifies HS256 JWT from `Authorization: Bearer` header |

### Route Matching

| Pattern     | Matches                                  |
| :---------- | :--------------------------------------- |
| `/api/data` | Exact match only                         |
| `/api/*`    | One path segment: `/api/users`, `/api/1` |
| `/api/**`   | Any depth: `/api/users/1/profile`        |

When `routes` is omitted or empty, middleware applies to all routes.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Fastify

```ts
import Fastify from "fastify";
import { cryptoPlugin } from "@sebastienrousseau/crypto-middleware";

const app = Fastify();

app.register(cryptoPlugin, {
  key: process.env.CRYPTO_KEY,
  operations: ["decrypt-request", "encrypt-response"],
});

app.post("/api/data", async (request) => {
  return { received: request.body };
});

app.listen({ port: 3000 });
```

The `cryptoPlugin` accepts the same configuration options as
`createCryptoMiddleware`.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category  | Example                               | Purpose                                  |
| :-------- | :------------------------------------ | :--------------------------------------- |
| Express   | [express.ts](examples/express.ts)     | Full Express setup with encrypt/decrypt  |
| Fastify   | [fastify.ts](examples/fastify.ts)     | Fastify plugin registration              |
| Webhook   | [webhook.ts](examples/webhook.ts)     | HMAC signature verification for webhooks |
| JWT       | [jwt.ts](examples/jwt.ts)             | JWT Bearer token verification            |
| Encrypted | [encrypted.ts](examples/encrypted.ts) | Full encrypted request/response pipeline |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

**Authenticated encryption.** All payload encryption uses
XChaCha20-Poly1305 via crypto-lib's secretbox. Nonces are generated
randomly for every seal operation.

**Timing-safe comparisons.** HMAC signature verification and JWT
validation use constant-time comparison to prevent timing
side-channel attacks.

**Minimal JWT surface.** The built-in JWT verifier supports HS256
only. For RS256, ES256, or full JOSE compliance, use a dedicated JWT
library alongside this middleware.

**No ambient network access.** The middleware performs only local
cryptographic operations. It never reaches out to external services.

**Responsible disclosure.** Report vulnerabilities via
[GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Documentation

API reference documentation is generated with TypeDoc. Build it
locally with:

```bash
pnpm --filter @sebastienrousseau/crypto-middleware docs
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
