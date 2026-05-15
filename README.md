# The Crypto Service Suite

[![npm](https://img.shields.io/npm/v/@sebastienrousseau/crypto-service.svg?style=for-the-badge&color=f14041)](https://www.npmjs.com/package/@sebastienrousseau/crypto-service)
![Codacy grade](https://img.shields.io/codacy/grade/40d370244f3843f389094afe7719c4e4?style=for-the-badge)
[![Coverage Status](https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service/solid.svg?branch=main&style=for-the-badge&color=blueviolet)](https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main)

[![Contributors][contributors-shield]](https://github.com/sebastienrousseau/crypto-service/graphs/contributors)
[![Forks][forks-shield]](https://github.com/sebastienrousseau/crypto-service/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge&color=ff69b4)](https://opensource.org/licenses/MIT)

**[Website](https://crypto-service.co) • [Documentation](https://crypto-service.co/docs/) • [Report Bug](https://github.com/sebastienrousseau/crypto-service/issues) • [Request Feature](https://github.com/sebastienrousseau/crypto-service/issues) • [Contributing Guidelines](https://github.com/sebastienrousseau/crypto-service/blob/main/.github/CONTRIBUTING.md)**

---

## Welcome

The Crypto Service Suite is a comprehensive monorepo providing cryptographic operations through multiple packages. It supports modern algorithms (Ed25519, X25519, AES-GCM-SIV, Argon2, BLAKE3, Schnorr), post-quantum cryptography (ML-KEM, ML-DSA, SLH-DSA, hybrid schemes), and legacy OpenPGP — all with a unified API, REST server, CLI, and framework integrations.

---

## Packages

| Package                                         | Description                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| [crypto-lib](packages/crypto-lib)               | Core cryptographic library — @noble/\* primitives, PQC, streaming, protocols            |
| [crypto-server](packages/crypto-server)         | Fastify REST API server with v1 (legacy PGP) and v2 (modern) endpoints                  |
| [crypto-api](packages/crypto-api)               | REST API utilities and documentation tools                                              |
| [crypto-cli](packages/crypto-cli)               | Command-line interface for key generation, encryption, signing, hashing                 |
| [crypto-sdk](packages/crypto-sdk)               | Type-safe TypeScript client for the v2 REST API (zero dependencies, fetch-based)        |
| [crypto-edge](packages/crypto-edge)             | Edge/serverless adapter — Cloudflare Workers, Vercel Edge, Deno, Bun, browsers          |
| [crypto-kms](packages/crypto-kms)               | Enterprise key management — AWS KMS, Google Cloud KMS, Azure Key Vault, HashiCorp Vault |
| [crypto-middleware](packages/crypto-middleware) | Express and Fastify middleware for auto-decrypt, signature verification, JWT            |
| [crypto-prisma](packages/crypto-prisma)         | Prisma ORM integration — transparent field-level encryption                             |
| [crypto-typeorm](packages/crypto-typeorm)       | TypeORM column-level encryption via decorators                                          |
| [crypto-react](packages/crypto-react)           | React hooks for client-side cryptography                                                |
| [crypto-vue](packages/crypto-vue)               | Vue 3 composables for client-side cryptography                                          |
| [crypto-testing](packages/crypto-testing)       | Deterministic keys, fast mocks, and test fixtures for CI/CD                             |
| [crypto-wasm](packages/crypto-wasm)             | WebAssembly performance accelerator (JS fallback included)                              |

---

## Getting Started

### Prerequisites

- **Node.js** >= 22.0.0
- **pnpm** >= 9.x

### Installation

```bash
git clone https://github.com/sebastienrousseau/crypto-service.git
cd crypto-service
pnpm install
pnpm -r run build
```

### Running the server

```bash
pnpm start:server
```

### Running tests

```bash
pnpm test
```

---

## Releases

|     Date     |                                                     Version                                                      |                  Release Notes                  |
| :----------: | :--------------------------------------------------------------------------------------------------------------: | :---------------------------------------------: |
| May 17, 2022 | [0.0.1](https://github.com/sebastienrousseau/crypto-service/releases/tag/sebastienrousseau-crypto-service-0.0.1) |                 Initial release                 |
| May 30, 2022 | [0.0.2](https://github.com/sebastienrousseau/crypto-service/releases/tag/sebastienrousseau-crypto-service-0.0.2) |                    Bug fixes                    |
| May 11, 2026 | [0.0.3](https://github.com/sebastienrousseau/crypto-service/releases/tag/sebastienrousseau-crypto-service-0.0.3) | Modern crypto, PQC, 14-package monorepo, v2 API |

---

## Semantic Versioning Policy

For transparency into our release cycle and in striving to maintain backward
compatibility, `crypto-service` follows [semantic versioning](http://semver.org/).

---

## Changelog

- [GitHub Releases](https://github.com/sebastienrousseau/crypto-service/releases)
- [CHANGELOG.md](CHANGELOG.md)

---

## Code of Conduct

We are committed to preserving and fostering a diverse, welcoming community.
Please read our [Code of Conduct](https://github.com/sebastienrousseau/crypto-service/blob/main/.github/CODE-OF-CONDUCT.md).

---

## Contributing

Thank you for using Crypto Service Suite! If you like the library, it would be
great if you can give it a star on [GitHub](https://github.com/sebastienrousseau/crypto-service).

Please read our [Contributing Guidelines](https://github.com/sebastienrousseau/crypto-service/blob/main/.github/CONTRIBUTING.md) for details on the process for submitting pull requests.

---

## License

Copyright (c) Sebastien Rousseau. All rights reserved.

Licensed under the [MIT](LICENSE) license.

---

## Acknowledgements

[Crypto Service Suite](https://crypto-service.co) is crafted by these people and
[contributors](https://github.com/sebastienrousseau/crypto-service/graphs/contributors).

| Contributors                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------- |
| [![Sebastien Rousseau](https://avatars0.githubusercontent.com/u/1394998?s=250)](https://sebastienrousseau.co.uk) |
| [Sebastien Rousseau](https://github.com/sebastienrousseau)                                                       |

[contributors-shield]: https://img.shields.io/github/contributors/sebastienrousseau/crypto-service.svg?style=for-the-badge
[forks-shield]: https://img.shields.io/github/forks/sebastienrousseau/crypto-service.svg?style=for-the-badge
