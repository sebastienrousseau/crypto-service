<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Development Guide

The single entry point for working on Crypto Service Suite: toolchain setup,
how to reproduce every CI gate locally, monorepo test layout, and the release model.

## Toolchain

| Tool       | Version         | Where it is configured                                                        |
| :--------- | :-------------- | :---------------------------------------------------------------------------- |
| Node.js    | >= 22.0.0 (LTS) | `package.json` (`engines.node`), `.devcontainer/devcontainer.json`, CI matrix |
| pnpm       | >= 9.0.0        | `package.json` (`packageManager`), root workspace                             |
| TypeScript | ~5.9.3          | `tsconfig.base.json`, workspace root & packages                               |

### Setup

```bash
git clone https://github.com/sebastienrousseau/crypto-service.git
cd crypto-service
pnpm install
```

A [.devcontainer](.devcontainer/devcontainer.json) configuration is provided for VS Code and GitHub Codespaces.

## Reproducing CI Gates Locally

All continuous integration verification gates map directly to pnpm workspace scripts:

| Gate                           | Local command                      | CI workflow               |
| :----------------------------- | :--------------------------------- | :------------------------ |
| Build (TypeScript compilation) | `pnpm -r run build`                | `ci.yml`                  |
| Linting (ESLint)               | `pnpm -r run lint`                 | `ci.yml`                  |
| Formatting (Prettier)          | `pnpm -r run format`               | `ci.yml`                  |
| Tests & Coverage (Mocha, c8)   | `pnpm -r run test`                 | `ci.yml`, `coveralls.yml` |
| Documentation (TypeDoc)        | `pnpm -r run docs`                 | `ci.yml`                  |
| Container build                | `docker build -t crypto-service .` | `docker.yml`              |

### Coverage Floor

The test suite enforces a **100% coverage floor** (statements, branches, functions, and lines) across all packages in the workspace. No pull request may lower or bypass coverage thresholds.

## Monorepo Layout

```
crypto-service/
├── packages/
│   ├── crypto-lib/         # Core cryptographic primitives & modern/PQ algorithms
│   ├── crypto-server/      # Fastify REST API server
│   ├── crypto-sdk/         # Typed REST client SDK
│   ├── crypto-cli/         # Command-line interface
│   ├── crypto-api/         # Shared schemas, routes, and OpenTelemetry
│   ├── crypto-middleware/  # Express & Fastify middleware
│   ├── crypto-react/       # React hooks
│   ├── crypto-vue/         # Vue 3 composables
│   ├── crypto-edge/        # Edge runtime adapters (Workers, Deno)
│   ├── crypto-kms/         # Cloud KMS envelope encryption
│   ├── crypto-prisma/      # Prisma field encryption
│   ├── crypto-typeorm/     # TypeORM column transformers
│   ├── crypto-wasm/        # WebAssembly acceleration
│   ├── crypto-testing/     # Test vectors and test harness
│   ├── crypto-mcp/         # Model Context Protocol (MCP) server
│   ├── crypto-lsp/         # Language Server Protocol (LSP) server
│   ├── crypto-cbom/        # Cryptographic Bill of Materials generator
│   └── crypto-benchmarks/  # Benchmark suite and performance profiling
├── docs/                   # Documentation root, policies, and ADRs
└── .github/workflows/      # Automated CI, Docker, Release, and Security workflows
```

## Release & Versioning Policy

- Versions advance strictly one step at a time (+0.0.1) on the `v0.0.x` line (`v0.0.1` → `v0.0.2` → `v0.0.3` ... → `v0.0.999` → `v0.1.0`).
- Active work for an upcoming version belongs on a dedicated branch named `feat/v<version>`.
- All 18 packages move in lockstep.
- Commits must follow Conventional Commits, be SSH-signed, and include DCO signoffs (`git commit -s -S`).
- Pushing a signed `v<version>` tag runs `.github/workflows/release.yml`, which publishes all 18 packages to GitHub Packages and **stages** them on npm with `scripts/publish-npm.sh` (`npm stage publish`).
- npm authentication uses [trusted publishing](https://docs.npmjs.com/trusted-publishers): each package on npmjs.com names this repository and `release.yml` as its trusted publisher, with permission to stage only, so no token is stored and CI alone cannot make a version public.
- To release on npm, a maintainer approves each staged version with 2FA, on the package's page on npmjs.com or with `npm stage list` and `npm stage approve <stage-id>`. Then run the **Verify npm release** workflow (`.github/workflows/verify-npm-release.yml`) with the version: it fails unless every package is public at that version with a provenance attestation (`scripts/check-provenance.mjs`).
