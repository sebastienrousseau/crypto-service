<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

<div align="center">

<img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-api-logo.svg" alt="Crypto API Logo" width="261" />

# Crypto API

Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.

[![Build Status](https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge)](https://github.com/sebastienrousseau/crypto-service/actions)
[![npm](https://img.shields.io/npm/v/@sebastienrousseau/crypto-api?style=for-the-badge)](https://www.npmjs.com/package/@sebastienrousseau/crypto-api)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge)](https://github.com/sebastienrousseau/crypto-service)
[![License](https://img.shields.io/badge/license-MIT%2FApache--2.0-blue?style=for-the-badge)](https://github.com/sebastienrousseau/crypto-service/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-green?style=for-the-badge)](https://nodejs.org/)

</div>

---

## Contents

- [Install](#install) -- Add the package to your project
- [Quick Start](#quick-start) -- Import and use types in seconds
- [Exported Types](#exported-types) -- All shared API type definitions
- [Utilities](#utilities) -- Exported utility functions
- [Examples](#examples) -- Runnable usage samples
- [License](#license) -- MIT OR Apache-2.0

---

## Install

```bash
# pnpm (recommended)
pnpm add @sebastienrousseau/crypto-api

# npm
npm i @sebastienrousseau/crypto-api

# yarn
yarn add @sebastienrousseau/crypto-api
```

---

## Quick Start

Import shared types and use them to build type-safe requests and responses
across `crypto-server` and `crypto-sdk`.

```ts
import type {
  AuthorizationToken,
  AuthorizationInfo,
  CollectionItem,
  JsonDocument,
  JsonRequest,
  RequestHeader,
  ResponseType,
} from "@sebastienrousseau/crypto-api/dist/@types/types";

// Type-safe request header
const header: RequestHeader = {
  key: "Content-Type",
  value: "application/json",
  description: "Request content type",
};

// Build a typed JSON request
const request: JsonRequest = {
  header: [header],
  key: "encrypt",
  value: "aes-256-gcm",
  description: "Encrypt payload with AES-256-GCM",
};
```

---

## Exported Types

All types are exported from `src/@types/types.ts`.

| Type                 | Description                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| `AuthorizationToken` | A single authorization token with `key`, `type`, and `value` fields.             |
| `AuthorizationInfo`  | Full authorization payload including bearer tokens and metadata.                 |
| `CollectionItem`     | A Postman-style collection item -- either a folder with children or an endpoint. |
| `JsonDocument`       | Top-level document with `info` metadata and an array of `CollectionItem`s.       |
| `MethodType`         | A named method with optional `request` and `response` details.                   |
| `JsonRequest`        | An API request shape with headers, key/value pair, and description.              |
| `RequestHeader`      | A single request header with `key`, `value`, and `description`.                  |
| `ResponseType`       | A response entry with HTTP `code`, `status`, and `body`.                         |

---

## Utilities

Utility functions are exported from `src/utils/index.ts`. They convert
Postman-style JSON collections into Markdown documentation.

| Function            | Signature                                                      | Description                                          |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| `createMarkdown`    | `(data: JsonDocument) => string`                               | Converts a full JSON document to Markdown.           |
| `readAuthorization` | `(data: AuthorizationInfo \| undefined) => string`             | Renders authorization info as a Markdown table.      |
| `readRequest`       | `(data: JsonRequest \| undefined) => string`                   | Renders request headers as a Markdown table.         |
| `readQueryParams`   | `(url: UrlWithQuery \| string \| null \| undefined) => string` | Renders query parameters as a Markdown table.        |
| `readFormDataBody`  | `(body: BodyShape \| null \| undefined) => string`             | Renders raw or form-data request bodies in Markdown. |
| `readResponse`      | `(responses: ResponseType[] \| undefined) => string`           | Renders response codes and an example response body. |
| `readMethods`       | `(method: MethodLike) => string`                               | Renders a single API method with all its sections.   |
| `readItems`         | `(items: ItemShape[], folderDeep?: number) => string`          | Recursively renders a collection tree to Markdown.   |
| `response`          | `(content: string, fileName: string) => Promise<void>`         | Writes generated Markdown to a file on disk.         |

---

## Examples

Runnable TypeScript examples live in the [`examples/`](./examples/) directory.

| File                                        | Purpose                                |
| ------------------------------------------- | -------------------------------------- |
| [`types.ts`](./examples/types.ts)           | Using API types for type-safe requests |
| [`validation.ts`](./examples/validation.ts) | Validating API payloads against types  |
| [`utilities.ts`](./examples/utilities.ts)   | Using exported utility functions       |

Run any example with:

```bash
npx ts-node examples/types.ts
```

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

<p align="right"><a href="#contents">Back to Top</a></p>
