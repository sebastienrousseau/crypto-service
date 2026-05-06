<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->
<!-- Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved. -->

<div align="center">

# Crypto TypeORM

TypeORM column-level encryption with a single decorator, powered by crypto-lib.

[![Build](https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?style=for-the-badge&branch=main)](https://github.com/sebastienrousseau/crypto-service/actions)
[![npm](https://img.shields.io/npm/v/@sebastienrousseau/crypto-typeorm.svg?style=for-the-badge)](https://www.npmjs.com/package/@sebastienrousseau/crypto-typeorm)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D22-green.svg?style=for-the-badge)](https://nodejs.org/)

**[Website](https://crypto-service.co)
&middot; [Documentation](https://crypto-service.co/docs/)
&middot; [Submit an Issue](https://github.com/sebastienrousseau/crypto-service/issues)
&middot; [Contributing Guidelines](https://github.com/sebastienrousseau/crypto-service/blob/main/.github/CONTRIBUTING.md)**

</div>

---

## Contents

- [Install](#install) &mdash; Add the package to your project
- [Quick Start](#quick-start) &mdash; Encrypt a column with one decorator
- [Configuration](#configuration) &mdash; Encryption keys and options
- [Decorator API](#decorator-api) &mdash; `@EncryptedColumn` reference
- [Subscriber API](#subscriber-api) &mdash; `EncryptionSubscriber` reference
- [Transformer API](#transformer-api) &mdash; `EncryptionTransformer` reference
- [Examples](#examples) &mdash; Runnable scripts for every approach
- [License](#license) &mdash; MIT

---

## Install

```bash
# npm
npm install @sebastienrousseau/crypto-typeorm

# yarn
yarn add @sebastienrousseau/crypto-typeorm

# pnpm
pnpm add @sebastienrousseau/crypto-typeorm
```

> **Peer dependency:** `typeorm ^0.3.0` must be installed in your project.

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

---

## Examples

Runnable example scripts live in [`examples/`](./examples/):

| Script                                        | Description                                       |
| --------------------------------------------- | ------------------------------------------------- |
| [`decorator.ts`](./examples/decorator.ts)     | Using `@EncryptedColumn` on entity fields         |
| [`subscriber.ts`](./examples/subscriber.ts)   | Centralised encryption via `EncryptionSubscriber` |
| [`transformer.ts`](./examples/transformer.ts) | Manual `ValueTransformer` on `@Column`            |
| [`migration.ts`](./examples/migration.ts)     | Encrypting existing plaintext columns             |

Run any example with:

```bash
npx ts-node examples/decorator.ts
```

---

## License

MIT -- see [LICENSE](../../LICENSE) for details.
