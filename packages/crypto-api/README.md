<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-api-logo.svg" alt="crypto-api" width="128" />
</p>

<h1 align="center">crypto-api</h1>

<p align="center">
  Shared TypeScript types and utilities for the Crypto Service Suite, defining the canonical API surface.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-api"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-api?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License MIT" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

- [Install](#install) — add the package to your project
- [Quick Start](#quick-start) — import and use types in seconds
- [Features](#features) — exported types and utility functions
- [Examples](#examples) — runnable usage samples
- [Security](#security) — guarantees and responsible disclosure
- [License](#license) — Apache-2.0 OR MIT

---

## Install

**npm / pnpm**

```bash
pnpm add @sebastienrousseau/crypto-api
# or
npm install @sebastienrousseau/crypto-api
```

**From source**

```bash
git clone https://github.com/sebastienrousseau/crypto-service.git
cd crypto-service
pnpm install
pnpm --filter @sebastienrousseau/crypto-api build
```

Requires **Node >= 22**.

<p align="right"><a href="#contents">Back to Top</a></p>

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

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Features

### Exported Types

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

### Utilities

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

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/` directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category   | Example                                 | Purpose                                |
| ---------- | --------------------------------------- | -------------------------------------- |
| Types      | [types.ts](examples/types.ts)           | Using API types for type-safe requests |
| Utilities  | [utilities.ts](examples/utilities.ts)   | Using exported utility functions       |
| Validation | [validation.ts](examples/validation.ts) | Validating API payloads against types  |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

**No native dependencies.** The package is pure TypeScript with no C, Rust, or WASM code and no platform-specific build step.

**Zero unsafe code.** No `eval`, no dynamic `require`, no `Function` constructor. No ambient network access.

**Responsible disclosure.** Report vulnerabilities via [GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service Suite contributors.

<p align="right"><a href="#contents">Back to Top</a></p>
