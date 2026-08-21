<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-prisma-logo.svg" alt="crypto-prisma logo" width="128" />
</p>

<h1 align="center">crypto-prisma</h1>

<p align="center">
  Transparent field-level encryption for Prisma ORM, powered by
  XChaCha20-Poly1305 and HMAC-SHA-256.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-prisma"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-prisma?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT%2FApache--2.0-blue?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

**Getting started**

- [Install](#install) -- npm, pnpm, peer dependencies
- [Quick Start](#quick-start) -- middleware and extension in a few lines

**Package reference**

- [Overview](#overview) -- what crypto-prisma does and why
- [Features](#features) -- what you get out of the box
- [Configuration](#configuration) -- every option at a glance
- [Searchable Encryption](#searchable-encryption) -- deterministic HMAC for exact-match queries
- [Examples](#examples) -- runnable scripts in `examples/`

**Operational**

- [Security](#security) -- guarantees and trade-offs
- [Documentation](#documentation) -- API reference
- [Contributing](#contributing) -- how to get involved
- [License](#license)

---

## Install

```bash
pnpm add @sebastienrousseau/crypto-prisma @prisma/client
# or
npm install @sebastienrousseau/crypto-prisma @prisma/client
```

Requires **Node >= 22** and **Prisma 5.x or 6.x**.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Quick Start

```ts
import { PrismaClient } from "@prisma/client";
import { createEncryptionMiddleware } from "@sebastienrousseau/crypto-prisma";

const prisma = new PrismaClient();

prisma.$use(
  createEncryptionMiddleware({
    key: process.env.FIELD_ENCRYPTION_KEY!, // 64-char hex (256-bit)
    encryptedFields: [
      { model: "User", fields: ["email", "phone"] },
      { model: "Patient", fields: ["ssn", "diagnosis"] },
    ],
  }),
);

// Usage is completely transparent:
const user = await prisma.user.create({
  data: { name: "Alice", email: "alice@example.com", phone: "+1-555-0100" },
});
// email and phone are encrypted in the database
// but returned as plaintext to your application
console.log(user.email); // "alice@example.com"
```

Or use the Client Extension (Prisma 4.16+):

```ts
import { PrismaClient } from "@prisma/client";
import { createFieldEncryptionExtension } from "@sebastienrousseau/crypto-prisma";

const prisma = new PrismaClient().$extends(
  createFieldEncryptionExtension({
    key: process.env.FIELD_ENCRYPTION_KEY!,
    encryptedFields: [{ model: "User", fields: ["email", "phone"] }],
  }),
);
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-prisma provides transparent field-level encryption for Prisma
ORM. It intercepts write operations (`create`, `update`, `upsert`,
`createMany`) to encrypt configured fields with XChaCha20-Poly1305
before they reach the database, and decrypts them transparently on
read. A deterministic HMAC-SHA-256 mode enables exact-match queries
on encrypted columns. Both the classic `$use()` middleware and the
modern `$extends()` Client Extension API are supported.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Features

| Feature                    | Detail                                                                                                                                                                              |
| :------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Encrypt on write**       | `create`, `update`, `upsert`, and `createMany` fields are encrypted with XChaCha20-Poly1305 (secretbox) before reaching the database. Each write uses a fresh random 24-byte nonce. |
| **Decrypt on read**        | `findUnique`, `findFirst`, and `findMany` results are decrypted transparently.                                                                                                      |
| **Graceful fallback**      | If decryption fails, the original value is returned as-is, making migration seamless.                                                                                               |
| **Searchable fields**      | Deterministic HMAC-SHA-256 mode for exact-match `WHERE` queries on encrypted columns.                                                                                               |
| **Two integration styles** | Classic `$use()` middleware and the modern `$extends()` Client Extension API.                                                                                                       |
| **Zero native deps**       | Built on `@sebastienrousseau/crypto-lib` which uses the audited `@noble/*` family.                                                                                                  |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Configuration

| Option                | Type            | Required | Default                | Description                                    |
| :-------------------- | :-------------- | :------- | :--------------------- | :--------------------------------------------- |
| `key`                 | `string`        | Yes      | --                     | 64-character hex string (256-bit key)          |
| `encryptedFields`     | `FieldConfig[]` | Yes      | --                     | Models and their fields to encrypt             |
| `algorithm`           | `string`        | No       | `"xchacha20-poly1305"` | Encryption algorithm                           |
| `deterministicFields` | `string[]`      | No       | `[]`                   | Fields that use HMAC for searchable encryption |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Searchable Encryption

For fields you need to query by exact match, use deterministic
encryption via HMAC-SHA-256:

```ts
prisma.$use(
  createEncryptionMiddleware({
    key: process.env.FIELD_ENCRYPTION_KEY!,
    encryptedFields: [{ model: "User", fields: ["email", "phone"] }],
    deterministicFields: ["email"], // email is searchable
  }),
);

// This works because email is hashed deterministically:
const user = await prisma.user.findFirst({
  where: { email: "alice@example.com" },
});
```

**Trade-off:** Deterministic fields reveal when two rows have the
same value for that field. Use this only for fields where exact-match
search is essential.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category   | Example                                 | Purpose                                                |
| :--------- | :-------------------------------------- | :----------------------------------------------------- |
| Middleware | [middleware.ts](examples/middleware.ts) | Basic middleware setup and transparent encrypt/decrypt |
| Extension  | [extension.ts](examples/extension.ts)   | Client Extension approach (Prisma 4.16+)               |
| Searchable | [searchable.ts](examples/searchable.ts) | Deterministic HMAC encryption for exact-match search   |
| Migration  | [migration.ts](examples/migration.ts)   | Migrate existing plaintext data to encrypted storage   |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

**XChaCha20-Poly1305 by default.** Every encrypted field uses a
fresh random 24-byte nonce, so identical plaintext values produce
different ciphertexts.

**Timing-safe comparisons.** HMAC verification for deterministic
fields uses constant-time comparison.

**No native dependencies.** The entire cryptographic stack is pure
TypeScript via the `@noble/*` family.

**Graceful migration.** Fields that fail decryption are returned
as-is, so you can enable encryption before migrating existing
plaintext data without downtime.

**Responsible disclosure.** Report vulnerabilities via
[GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Documentation

API reference documentation is generated with TypeDoc. Build it
locally with:

```bash
pnpm --filter @sebastienrousseau/crypto-prisma docs
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
