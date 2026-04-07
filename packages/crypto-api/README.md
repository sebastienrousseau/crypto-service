# 📝 @sebastienrousseau/crypto-api

> ⚠️ **This package contains no cryptographic code.** Despite its name (kept
> for historical / import-path stability), `crypto-api` is the suite's
> internal Postman → Markdown documentation generator. It is marked
> `"private": true` and is **not published** to any registry.
>
> If you came here looking for HTTP cryptographic operations, you want
> [`@sebastienrousseau/crypto-server`](../crypto-server). If you came
> here looking for the pure crypto core, you want
> [`@sebastienrousseau/crypto-lib`](../crypto-lib).

---

## What it does

`crypto-api` reads a [Postman](https://www.postman.com/) collection v2.x
JSON export and emits a Markdown reference document. It's used inside the
suite to keep the human-readable HTTP API documentation in sync with the
machine-readable Postman collection.

It's a single ~200-line module with no runtime dependencies beyond
`minimist` and the Node.js standard library.

---

## Installation

This package is `private: true` and never published. Use it from inside the
workspace:

```bash
# from the repo root
pnpm install --frozen-lockfile
pnpm --filter @sebastienrousseau/crypto-api run build
```

Requires **Node.js ≥ 20.18**.

---

## Usage

```bash
node packages/crypto-api/dist/index.js <path-to-collection.json> <output-name>
```

Or from inside the package:

```bash
cd packages/crypto-api
node dist/index.js ./src/collections/postman_collection.json crypto-server-api
# → ./src/docs/crypto-server-api.md
```

The generated Markdown lands in `packages/crypto-api/src/docs/<output-name>.md`.

### Programmatic use

```ts
import { createMarkdown } from "@sebastienrousseau/crypto-api/dist/utils";
import * as fs from "fs/promises";

const collection = JSON.parse(
  await fs.readFile("./postman_collection.json", "utf8"),
);
const markdown = createMarkdown(collection);
await fs.writeFile("./api.md", markdown, "utf8");
```

The public exports are:

| Export | Role |
|---|---|
| `createMarkdown(doc)`              | Top-level — turns a Postman v2.x JSON document into a Markdown string. |
| `readAuthorization(authInfo)`      | Section helper for `## 🔑 Authentication` blocks. |
| `readRequest(req)`                 | Section helper for `### Request Headers` tables. |
| `readQueryParams(url)`             | Section helper for `### Query Params` tables. |
| `readFormDataBody(body)`           | Section helper for `### Body (raw|formdata)` blocks. |
| `readResponse(responses[])`        | Section helper for `### Response` tables + example body. |
| `readMethods(method)`              | Renders a single Postman item (one HTTP request). |
| `readItems(items[], folderDepth?)` | Recursively renders folders + leaf items. |
| `response(content, fileName)`      | Writes the rendered Markdown to `src/docs/<fileName>.md`. |

Defensive guarantees the test suite locks in:

- `createMarkdown(null)` returns `""` instead of throwing.
- `createMarkdown({ info: null, item: undefined })` returns a small
  fallback string instead of throwing.
- `readResponse([])` returns `""`.
- `readResponse(...)` does **not** print to stdout (the previous
  implementation logged a side-effect line, which has been removed).

---

## Why is it called `crypto-api`?

For historical reasons. Earlier drafts of the Crypto Service Suite used
`@sebastienrousseau/crypto-api` as the placeholder for what became
`crypto-server`, and the documentation tool was originally bundled inside
it. When the REST work was extracted into `crypto-server`, the doc
generator stayed behind under the `crypto-api` package name to avoid
breaking import paths in older tooling.

The package is `private: true` so the misleading name can never be
published to npm. A future rename to something like
`@sebastienrousseau/postman-doc-gen` is the cleaner long-term fix —
tracked separately.

---

## Local development

```bash
pnpm --filter @sebastienrousseau/crypto-api run build
pnpm --filter @sebastienrousseau/crypto-api run test
pnpm --filter @sebastienrousseau/crypto-api run lint
```

The test suite has **107 specs** across four files:

```
packages/crypto-api/__tests__/
├── api.test.ts      ← end-to-end exercises createMarkdown + helpers
├── index.test.ts    ← init() argument parsing, error paths
├── types.test.ts    ← shape assertions for the public types
└── utils.test.ts    ← per-helper edge cases (null, malformed, empty)
```

Source layout:

```
packages/crypto-api/
├── src/
│   ├── @types/types.ts   ← public type definitions
│   ├── utils/index.ts    ← all the rendering helpers
│   ├── index.ts          ← bin entrypoint with init()
│   ├── collections/      ← input Postman collections
│   ├── environments/     ← input Postman environments
│   └── docs/             ← output Markdown files (gitignored except README)
└── __tests__/
```

The `src/docs/*.md` files are gitignored (except `README.md`) — the test
suite writes throwaway fixtures there, and you should not commit them.

---

## License

MIT — see [LICENSE](LICENSE). Copyright © Sebastien Rousseau.
