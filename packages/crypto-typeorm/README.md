<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-typeorm-logo.svg" alt="crypto-typeorm" width="128" />
</p>

<h1 align="center">crypto-typeorm</h1>

<p align="center">
  TypeORM column-level encryption with a single decorator, powered by crypto-lib.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-typeorm"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-typeorm?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License MIT" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

- [Install](#install) — add the package to your project
- [Quick Start](#quick-start) — encrypt a column with one decorator
- [Configuration](#configuration) — encryption keys and options
- [Decorator API](#decorator-api) — `@EncryptedColumn` reference
- [Subscriber API](#subscriber-api) — `EncryptionSubscriber` reference
- [Transformer API](#transformer-api) — `EncryptionTransformer` reference
- [Examples](#examples) — runnable scripts for every approach
- [Security](#security) — responsible disclosure
- [License](#license) — Apache-2.0 OR MIT

---

## Install

**npm / pnpm**

```bash
npm install @sebastienrousseau/crypto-typeorm
# or
pnpm add @sebastienrousseau/crypto-typeorm
```

> **Peer dependency:** `typeorm ^0.3.0` must be installed in your project.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Quick Start

```ts
import { Entity, PrimaryGeneratedColumn } from "typeorm";
import { EncryptedColumn } from "@sebastienrousseau/crypto-typeorm";

@Entity()
class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @EncryptedColumn({
    encrypt: { key: process.env.COLUMN_ENCRYPTION_KEY! },
  })
  ssn!: string;
}
```

That is it. The `ssn` column is stored as an XChaCha20-Poly1305 sealed box (Base64) and decrypted transparently on every read.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Configuration

All APIs accept an `EncryptionConfig` object:

| Property    | Type                    | Default                | Description                                            |
| ----------- | ----------------------- | ---------------------- | ------------------------------------------------------ |
| `key`       | `string`                | **required**           | 256-bit key as a 64-char hex string                    |
| `algorithm` | `string`                | `"xchacha20-poly1305"` | Algorithm identifier (reserved for future use)         |
| `fields`    | `Map<string, string[]>` | `undefined`            | Per-entity field list (used by `EncryptionSubscriber`) |

### Environment variable fallback

`@EncryptedColumn` will read `process.env.TYPEORM_ENCRYPTION_KEY` when no key is provided in decorator options.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Decorator API

### `@EncryptedColumn(options?)`

A property decorator that combines TypeORM's `@Column` with an `EncryptionTransformer`.

```ts
@EncryptedColumn()                              // uses TYPEORM_ENCRYPTION_KEY env var
@EncryptedColumn({ encrypt: { key: "..." } })   // explicit key
@EncryptedColumn({ type: "text", nullable: true, encrypt: { key: "..." } })
```

**Options** extend TypeORM `ColumnOptions` (minus `transformer`) with:

| Property  | Type               | Description                |
| --------- | ------------------ | -------------------------- |
| `encrypt` | `EncryptionConfig` | Encryption key and options |

The column type defaults to `"text"` to accommodate Base64 sealed boxes.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Subscriber API

### `EncryptionSubscriber`

An `EntitySubscriberInterface` that encrypts/decrypts fields based on a centralised configuration. Useful when you want to keep entity classes clean.

```ts
import { DataSource } from "typeorm";
import { EncryptionSubscriber } from "@sebastienrousseau/crypto-typeorm";

const ds = new DataSource({
  // ...
  subscribers: [
    new EncryptionSubscriber({
      key: process.env.COLUMN_ENCRYPTION_KEY!,
      fields: new Map([
        ["User", ["ssn", "email"]],
        ["Payment", ["cardNumber"]],
      ]),
    }),
  ],
});
```

**Lifecycle hooks:**

| Hook           | Behaviour                           |
| -------------- | ----------------------------------- |
| `beforeInsert` | Encrypts configured fields in-place |
| `beforeUpdate` | Encrypts configured fields in-place |
| `afterLoad`    | Decrypts configured fields in-place |

Decryption is wrapped in a try/catch so that legacy unencrypted rows are left as-is during a gradual migration.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Transformer API

### `EncryptionTransformer`

A standard TypeORM `ValueTransformer` for manual use on any `@Column`.

```ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { EncryptionTransformer } from "@sebastienrousseau/crypto-typeorm";

const transformer = new EncryptionTransformer({
  key: process.env.COLUMN_ENCRYPTION_KEY!,
});

@Entity()
class Secret {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text", transformer })
  value!: string;
}
```

**Methods:**

| Method        | Input                       | Output                      |
| ------------- | --------------------------- | --------------------------- |
| `to(value)`   | plaintext or `null`         | Base64 sealed box or `null` |
| `from(value)` | Base64 sealed box or `null` | plaintext string or `null`  |

Non-string values passed to `to()` are JSON-serialised before encryption. `null` and `undefined` pass through unchanged in both directions.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/` directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category    | Example                                   | Purpose                                           |
| ----------- | ----------------------------------------- | ------------------------------------------------- |
| Decorator   | [decorator.ts](examples/decorator.ts)     | Using `@EncryptedColumn` on entity fields         |
| Subscriber  | [subscriber.ts](examples/subscriber.ts)   | Centralised encryption via `EncryptionSubscriber` |
| Transformer | [transformer.ts](examples/transformer.ts) | Manual `ValueTransformer` on `@Column`            |
| Migration   | [migration.ts](examples/migration.ts)     | Encrypting existing plaintext columns             |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

**Authenticated encryption.** All field encryption uses XChaCha20-Poly1305 via crypto-lib's secretbox. Each write generates a fresh random nonce.

**Graceful fallback.** Decryption failures return the original value, enabling seamless migration from plaintext to encrypted columns.

**No native dependencies.** Built on `@sebastienrousseau/crypto-lib` which uses the audited `@noble/*` family — pure TypeScript, no C bindings.

**Responsible disclosure.** Report vulnerabilities via [GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service Suite contributors.

<p align="right"><a href="#contents">Back to Top</a></p>
