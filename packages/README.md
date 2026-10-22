<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-service-logo.svg" alt="Crypto Service Suite logo" width="128" />
</p>

<h1 align="center">Crypto Service Suite packages</h1>

<p align="center">
  The 18 packages of the monorepo: a post-quantum cryptography library,
  its CLI, REST server and SDK, and integrations built on them.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://github.com/sebastienrousseau/crypto-service/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg?style=for-the-badge" alt="License: Apache-2.0 OR MIT" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen?style=for-the-badge&logo=node.js" alt="Node.js 22 or newer" /></a>
</p>

---

## Contents

- [Packages](#packages): every package and what it does
- [Quick Start](#quick-start): install, build, test, run
- [Coverage](#coverage): where the coverage floors are set
- [License](#license): Apache-2.0 OR MIT

---

## Packages

The table and the dependency list below are generated from each
package's `package.json` by `node scripts/packages-index.mjs`; `make
check` fails when they are out of date.

<!-- BEGIN GENERATED: scripts/packages-index.mjs -->

All 18 packages share one version; descriptions are the
ones published to npm.

| Package                                   | Description                                                                                                                                                                                                                                                                                               |
| :---------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`crypto-api`](crypto-api/)               | TypeScript types for Postman collections and a converter that turns a Postman collection into Markdown API documentation. Not the crypto-server request/response contract: that is the server's OpenAPI document.                                                                                         |
| [`crypto-benchmarks`](crypto-benchmarks/) | Benchmarks comparing classical and post-quantum cryptography in JavaScript: ops/sec, latency and throughput for RSA, ECDSA, AES, SHA-2, ML-KEM and ML-DSA.                                                                                                                                                |
| [`crypto-cbom`](crypto-cbom/)             | Cryptographic Bill of Materials (CBOM) generator and auditor: scans code for cryptographic assets and writes CycloneDX 1.6 or SPDX 3.0, with a heuristic quantum-readiness score.                                                                                                                         |
| [`crypto-cli`](crypto-cli/)               | Post-quantum cryptography CLI: hash, generate ML-KEM, ML-DSA and Ed25519 keys, encrypt, sign and verify files, HPKE, Argon2id password hashing and CBOM scans from the terminal.                                                                                                                          |
| [`crypto-edge`](crypto-edge/)             | Edge and serverless cryptography for Cloudflare Workers, Vercel Edge, Deno, Bun and browsers, with runtime detection and a Web Crypto API adapter for crypto-lib.                                                                                                                                         |
| [`crypto-kms`](crypto-kms/)               | Key management interface for envelope encryption, signing and key rotation, with providers for AWS KMS (including ML-DSA signing keys), Google Cloud KMS, HashiCorp Vault Transit and an in-memory local store. The Azure Key Vault provider is a stub and the PKCS#11 provider is a software simulation. |
| [`crypto-lib`](crypto-lib/)               | Post-quantum cryptography library for TypeScript and Node.js: ML-KEM, ML-DSA, SLH-DSA, HPKE, AES-GCM, XChaCha20-Poly1305, Ed25519, X25519, SHA-3, BLAKE3, Argon2id and OpenPGP.                                                                                                                           |
| [`crypto-lsp`](crypto-lsp/)               | Language Server Protocol (LSP) server for cryptography: flags broken hashes, weak ciphers, short keys, quantum-vulnerable algorithms, hardcoded secrets and malformed PEM, with quick fixes.                                                                                                              |
| [`crypto-mcp`](crypto-mcp/)               | Model Context Protocol (MCP) server that gives AI assistants and agents cryptography tools: key generation, encryption, ML-KEM, ML-DSA signing, hashing, streaming encryption, KMS and CBOM.                                                                                                              |
| [`crypto-middleware`](crypto-middleware/) | Express and Fastify middleware that decrypts requests, encrypts responses and verifies HMAC signatures and JWTs on matching routes.                                                                                                                                                                       |
| [`crypto-prisma`](crypto-prisma/)         | Prisma Client extension for transparent field-level encryption with XChaCha20-Poly1305: encrypt chosen model fields before they reach the database.                                                                                                                                                       |
| [`crypto-react`](crypto-react/)           | React hooks for client-side cryptography: key generation, encryption, signing, hashing and post-quantum hybrid streaming encryption (ML-KEM-768).                                                                                                                                                         |
| [`crypto-sdk`](crypto-sdk/)               | Typed TypeScript client for the crypto-server REST API: post-quantum, encryption, signing and hashing calls. Zero dependencies, built on fetch.                                                                                                                                                           |
| [`crypto-server`](crypto-server/)         | Fastify REST API for cryptography as a service: post-quantum ML-KEM and ML-DSA, encryption, signing, hashing and KMS endpoints, with OpenAPI docs, API key or JWT auth, rate limiting and OpenTelemetry.                                                                                                  |
| [`crypto-testing`](crypto-testing/)       | Test utilities for crypto-lib: deterministic keys, known-answer test vectors, mocks and fixtures for fast, reproducible CI.                                                                                                                                                                               |
| [`crypto-typeorm`](crypto-typeorm/)       | TypeORM column-level encryption with a single decorator: transparent XChaCha20-Poly1305 encryption of entity columns, powered by crypto-lib.                                                                                                                                                              |
| [`crypto-vue`](crypto-vue/)               | Vue 3 composables for client-side cryptography: key generation, encryption, signing, hashing and post-quantum hybrid streaming encryption (ML-KEM-768), with reactive state.                                                                                                                              |
| [`crypto-wasm`](crypto-wasm/)             | Placeholder for a WebAssembly accelerator for crypto-lib. It ships runtime detection and an accelerator interface only; no WebAssembly module yet, so operations run in JavaScript.                                                                                                                       |

### Workspace dependencies

- `crypto-api`: no workspace dependencies
- `crypto-benchmarks`: `crypto-lib`
- `crypto-cbom`: `crypto-lib`
- `crypto-cli`: `crypto-cbom`, `crypto-kms`, `crypto-lib`
- `crypto-edge`: `crypto-lib`
- `crypto-kms`: `crypto-lib`
- `crypto-lib`: no workspace dependencies
- `crypto-lsp`: `crypto-lib`
- `crypto-mcp`: `crypto-kms`, `crypto-lib`
- `crypto-middleware`: `crypto-lib`
- `crypto-prisma`: `crypto-lib`
- `crypto-react`: `crypto-lib`
- `crypto-sdk`: no workspace dependencies
- `crypto-server`: `crypto-kms`, `crypto-lib`
- `crypto-testing`: `crypto-lib`
- `crypto-typeorm`: `crypto-lib`
- `crypto-vue`: `crypto-lib`
- `crypto-wasm`: `crypto-lib`

<!-- END GENERATED -->

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Start the server
pnpm start:server
```

---

## Coverage

Each package's `test` script sets its coverage floor with `c8
--check-coverage`: 100% of lines, branches and functions everywhere,
except crypto-lib's branch floor of 99.5%. `make check` and CI run every
package's tests against its floor.

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

<p align="right"><a href="#contents">Back to Top</a></p>
