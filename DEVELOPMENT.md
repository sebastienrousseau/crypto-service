<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Development Guide

The single entry point for working on Crypto Service Suite: toolchain setup,
how to reproduce every CI gate locally, monorepo test layout, and the release model.

## Toolchain

| Tool       | Version         | Where it is configured                                                        |
| :--------- | :-------------- | :---------------------------------------------------------------------------- |
| Node.js    | >= 22.0.0 (LTS) | `package.json` (`engines.node`), `.devcontainer/devcontainer.json`, CI matrix |
| pnpm       | 11.9.0          | `package.json` (`packageManager`), `pnpm-workspace.yaml` (settings)           |
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

`pnpm -r run test` measures coverage and enforces the floor; `pnpm -r run test:run` runs the same tests without measuring it. CI enforces the floor on Linux with Node.js 24, the one runtime where every code path runs: the native ML-KEM, ML-DSA, SLH-DSA and Argon2 back ends need Node.js 24.7+, and Windows has no POSIX file modes or signal-driven shutdown. Node.js 22, macOS and Windows run `test:run`.

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
- Before tagging, write the release's Highlights in `.github/release-highlights.md` (2 to 4 bullets, its `<!-- release: v<version> -->` marker naming the tag), in the commit that dates the release.
- Pushing a signed `v<version>` tag runs `.github/workflows/release.yml`. Its `build` job, which holds no write permission, checks the manifests and the Highlights against the tag, builds, tests and packs the npm tarballs (`scripts/pack-npm.sh`). Its `github` job attests the tarballs' build provenance, creates the GitHub release titled `crypto-service <version>` with notes composed by `scripts/release-notes.mjs` (the Highlights, the merged pull requests, the SHA-256 of every asset and the changelog link), attaches the tarballs and the provenance bundle, and publishes the tarballs to GitHub Packages.
- Its `npm` job runs in the `npm` GitHub environment, which waits for a maintainer to approve the run (Actions → the release run → **Review deployments**), then publishes those tarballs with `scripts/publish-npm.sh` and fails unless every version is public with a provenance attestation (`scripts/check-provenance.mjs`).
- npm authentication uses [trusted publishing](https://docs.npmjs.com/trusted-publishers): each package on npmjs.com names this repository, `release.yml` and the `npm` environment as its trusted publisher, so no token is stored and only an approved run can publish. The **Verify npm release** workflow re-runs the provenance check for a version on demand.
- If a release's run did not reach the registries, run **Release** by hand from `main` with that `tag` (the `npm` environment must also allow `main` while it runs). It builds nothing: `scripts/release-assets.sh` downloads the tarballs attached to the release and refuses any whose version or SHA-256 differs from the release notes, and the `github` and `npm` jobs publish only the versions each registry is missing.
