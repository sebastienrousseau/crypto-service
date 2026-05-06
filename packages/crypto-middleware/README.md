<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->
<!-- Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved. -->

<div align="center">

# Crypto Middleware

Plug-and-play cryptographic middleware for Express and Fastify -- auto-decrypt requests, verify signatures, and encrypt responses.

[![Build](https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?style=for-the-badge&branch=main)](https://github.com/sebastienrousseau/crypto-service/actions)
[![npm](https://img.shields.io/npm/v/@sebastienrousseau/crypto-middleware.svg?style=for-the-badge)](https://www.npmjs.com/package/@sebastienrousseau/crypto-middleware)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D22-green.svg?style=for-the-badge)](https://nodejs.org/)

**[Website](https://crypto-service.co)
&middot; [Documentation](https://crypto-service.co/docs/)
&middot; [Submit an Issue](https://github.com/sebastienrousseau/crypto-service/issues)
&middot; [Contributing Guidelines](https://github.com/sebastienrousseau/crypto-service/blob/main/.github/CONTRIBUTING.md)**

</div>

---

## Contents

- [Install](#install) &mdash; Add the middleware to your project
- [Quick Start](#quick-start) &mdash; Express and Fastify setup in seconds
- [Configuration](#configuration) &mdash; All available options
- [Operations](#operations) &mdash; What each operation does
- [Route Matching](#route-matching) &mdash; Apply middleware selectively
- [Examples](#examples) &mdash; Runnable scripts for every feature
- [License](#license) &mdash; MIT

---

## Install

```bash
# npm
npm install @sebastienrousseau/crypto-middleware

# yarn
yarn add @sebastienrousseau/crypto-middleware

# pnpm
pnpm add @sebastienrousseau/crypto-middleware
```

Install the framework you need as a peer dependency:

```bash
# For Express
npm install express

# For Fastify
npm install fastify fastify-plugin
```

> **Requirements:** Node >= 22. Express >= 4 or Fastify >= 4.

---

## Quick Start

### Express

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

### Fastify

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

---

## Configuration

| Option       | Type       | Required | Description                                        |
| ------------ | ---------- | -------- | -------------------------------------------------- |
| `key`        | `string`   | \*       | Hex-encoded 256-bit key for encryption/decryption. |
| `routes`     | `string[]` | No       | Glob patterns for routes to apply middleware to.   |
| `operations` | `string[]` | No       | Operations to perform (see below).                 |
| `hmacKey`    | `string`   | \*       | Hex-encoded HMAC key for signature verification.   |
| `jwtSecret`  | `string`   | \*       | Secret for HS256 JWT verification.                 |

\* Required when the corresponding operation is enabled.

---

## Operations

### `decrypt-request`

Decrypts incoming JSON request bodies. Expects the body to contain an `encrypted` field with a base64-encoded sealed box (XChaCha20-Poly1305). The decrypted payload replaces `req.body`.

**Request format:**

```json
{
  "encrypted": "base64-encoded-sealed-box"
}
```

### `encrypt-response`

Encrypts outgoing JSON responses. The response body is sealed using XChaCha20-Poly1305 and returned as:

```json
{
  "encrypted": "base64-encoded-sealed-box"
}
```

### `verify-signature`

Verifies HMAC-SHA256 signatures on incoming requests. Looks for the signature in the `x-signature` or `x-hub-signature-256` header. Supports both raw hex and `sha256=<hex>` formats.

Returns HTTP 401 if the signature is missing or invalid.

### `verify-jwt`

Verifies HS256 JWT tokens from the `Authorization: Bearer <token>` header. The decoded payload is attached to the request as `req.jwtPayload`. Checks `exp` and `nbf` claims automatically.

Returns HTTP 401 if the token is missing, expired, or invalid.

---

## Route Matching

Use the `routes` option to apply middleware only to specific paths:

```ts
createCryptoMiddleware({
  key: process.env.CRYPTO_KEY,
  operations: ["encrypt-response"],
  routes: ["/api/**"], // Match all /api/ paths
});
```

Supported patterns:

| Pattern     | Matches                                  |
| ----------- | ---------------------------------------- |
| `/api/data` | Exact match only                         |
| `/api/*`    | One path segment: `/api/users`, `/api/1` |
| `/api/**`   | Any depth: `/api/users/1/profile`        |

When `routes` is omitted or empty, middleware applies to **all** routes.

---

## Examples

Runnable TypeScript examples are provided in the [`examples/`](./examples/) directory.

| Example              | File                                      | Description                              |
| -------------------- | ----------------------------------------- | ---------------------------------------- |
| Express middleware   | [`express.ts`](./examples/express.ts)     | Full Express setup with encrypt/decrypt  |
| Fastify plugin       | [`fastify.ts`](./examples/fastify.ts)     | Fastify plugin registration              |
| Webhook verification | [`webhook.ts`](./examples/webhook.ts)     | HMAC signature verification for webhooks |
| JWT verification     | [`jwt.ts`](./examples/jwt.ts)             | JWT Bearer token verification            |
| Encrypted pipeline   | [`encrypted.ts`](./examples/encrypted.ts) | Full encrypted request/response pipeline |

```bash
npx ts-node examples/express.ts
```

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

<p align="right"><a href="#contents">Back to Top</a></p>
