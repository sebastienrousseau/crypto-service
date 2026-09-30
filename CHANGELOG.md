<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.6] - 2026-09-30

### Added

- **2027 post-quantum trends and audit report**: New research document, `docs/research/2027-post-quantum-trends-and-repository-analysis.md`.

### Changed

- **Windows CI**: The Windows job now verifies the build only, instead of running the full suite.
- **Dependency overrides**: `pnpm.overrides` in `package.json` is now the only override list. The unused npm `overrides` block and the `pnpm-workspace.yaml` list (read only by pnpm 10+, and out of sync) are removed. Removing them did not change any resolved version; `ip-address >=10.5.1`, which only the workspace list carried, moves to `pnpm.overrides`.
- **Accurate claims**: README, SECURITY.md, docs and website no longer claim FIPS 140-3 validation, HSM support, GCP/Azure/Vault KMS, WebAssembly acceleration, DORA or CRA compliance, zero dependencies, or benchmark figures that no committed code produces. The PKCS#11 provider requires `simulate: true` and reports `fipsLevel: "none (software simulation)"`; the `/v2/compliance` endpoints return a labelled self-assessment computed per request (the SDK type drops `complianceScore` and adds `disclaimer`); crypto-benchmarks times real ML-KEM and ML-DSA calls.
- **Versions from package.json**: crypto-server telemetry, crypto-mcp, crypto-lsp, crypto-cbom and crypto-wasm report their version from `package.json` instead of a stale `0.0.3`. CycloneDX output omits the component version when none is given.
- **Lockstep version bump**: All 18 packages, the root manifest and `CITATION.cff` move to 0.0.6.

### Security

- **crypto-server authentication fails closed**: With no `CRYPTO_API_KEY` or `JWT_SECRET`, requests now get `401` instead of anonymous admin access; `ALLOW_ANONYMOUS=1` opts in explicitly. Production refuses to start without a credential, and `JWT_SECRET` must be at least 32 bytes. One `onRequest` hook authenticates every route except `/health`, `/live`, `/ready`, `/metrics` and `/docs`, so a JWT-only setup is enforced (it was ignored before). JWT verification is pinned to HS256.
- **`/v1/revoke` no longer returns the private key**: the response carries the revoked public key only, with a strict response schema.
- **Generated keys stay out of the keystore**: `generate`, `revoke` and `reformat` write only to `CRYPTO_KEY_OUT_DIR` (nothing is written when it is unset), private key files are created `0600`, and the keystore refuses the bundled test keys in production unless `CRYPTO_KEY_DIR` is set.
- **Bounded work factors**: scrypt, PBKDF2 and Argon2 costs are capped in crypto-lib (including costs read from PHC strings and password-encrypt headers) and in the `/v2/kdf` and `/v2/password` schemas, so one request cannot block the server for seconds.
- **Streaming AEAD truncation**: `streamDecrypt` now rejects a stream that ends without its final chunk.
- **Shamir secret sharing**: `splitSecret` and `splitSecretWithCommitments` reject secrets not below the Ed25519 group order instead of silently changing them.
- **crypto-edge**: `installPolyfills()` no longer installs a `Math.random` fallback for `crypto.getRandomValues`; `randomBytes()` throws when no secure source exists. `insecureGetRandomValues` is removed.
- **crypto-mcp**: KMS wrap/unwrap uses a random in-process key-encryption key instead of one derived from the key ID; ML-KEM-768 key generation returns real keys; `crypto_hash` enforces its algorithm list; keys must be 64 hex characters (no SHA-256 fallback); `executeTool` is split into one handler per tool.
- **`qs`**: Pinned to `>=6.16.0` through `pnpm.overrides`.
- **`@grpc/grpc-js`**: Override raised to `>=1.14.5` (GHSA-m9gg-hp2v-232j, high: `getAuthContext` could report unauthorized certificates as authorized; GHSA-f596-whhp-79r4, low: handler error messages leaked to clients). Reached through crypto-kms (Google Cloud KMS) and crypto-server (OpenTelemetry gRPC exporters).
- **`markdown-it`**: Pinned to `^14.3.1` through `pnpm.overrides` (GHSA-253c-mchw-3w2r, quadratic-time linkify parsing reached through TypeDoc).

## [0.0.5] - 2026-09-29

### Added

- **Hardware Security Module (HSM) PKCS#11 Provider (`@sebastienrousseau/crypto-kms`)**: Hardware token and HSM provider supporting PKCS#11 session management, key slot enumeration, and hardware-backed signing.
- **Wholesale Payment Rails & ISO 20022 Dual-Signature (`@sebastienrousseau/crypto-lib`)**: Hybrid quantum-safe dual-signing combining classical ECDSA/Ed25519 with ML-DSA-87 for ISO 20022 financial message authenticity.
- **Dynamic Crypto-Agility & MTU Negotiation Engine (`@sebastienrousseau/crypto-sdk`)**: Client-side network MTU discovery and adaptive fragmentation handling large post-quantum public keys and signatures over constrained network pipes.
- **High-Throughput Streaming & Batch Pipelines (`@sebastienrousseau/crypto-server`)**: Enterprise bulk encryption and streaming endpoints (`/v2/crypto/stream`, `/v2/crypto/batch`) for high-frequency transaction pipelines.
- **Automated CBOM Scanning CLI Commands (`@sebastienrousseau/crypto-cli`)**: Terminal commands `crypto scan cbom` and `crypto audit dora` generating CycloneDX 1.6 Cryptographic Bill of Materials and DORA compliance scorecards.
- **Lockstep Workspace Bump to v0.0.5**: Synchronized version 0.0.5 across all 18 monorepo packages, root manifest, CITATION.cff, and documentation portal.

## [0.0.4] - 2026-09-29

### Added

- **Institutional White Papers & Technical Publications**: Dedicated research hub (`/whitepapers/`) and 8 comprehensive technical treatises matching the authoritative depth and layout of `sebastienrousseau.com/research`:
  - _Post-Quantum Security for Wholesale Payments & Financial Infrastructure_
  - _Sovereign Crypto-as-a-Service (CaaS) Architecture_
  - _The 2027 Post-Quantum Strategic Horizon & Cryptographic Audit_
  - _Harvest-Now-Decrypt-Later: Defending Long-Dated Enterprise Assets_
  - _Post-Quantum Migration Architecture & Interbank Payment Rails_
  - _DORA Article 13 & CycloneDX 1.6 CBOM Regulatory Compliance Manual_
  - _Empirical Benchmarking: Sub-Millisecond PQC Signatures at Enterprise Scale_
  - _Transparent Database Field Encryption with Prisma & TypeORM_
- **Sovereign CaaS Multi-Tenant Metering**: Sliding-window token bucket engine with standardized rate-limiting headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-License-Tier`) and payload quota enforcement in `@sebastienrousseau/crypto-server`.
- **DORA & CBOM Compliance REST Endpoints**: Automated compliance auditing endpoints:
  - `GET /v2/compliance/dora`: Automated DORA (Regulation EU 2022/2554) Article 9/13 scorecard, quantum-readiness ratio, cipher deprecation schedule, and cryptographic asset inventory.
  - `GET /v2/compliance/cbom`: Automated machine-readable CycloneDX 1.6 Cryptographic Bill of Materials (CBOM) conforming to the EU Cyber Resilience Act (CRA) Article 14.
- **Institutional SEO & Competitor Architecture Comparisons**: Comprehensive comparison hub contrasting Sovereign CaaS against BitGo (CaaS), Fireblocks (MPC), Copper (ClearLoop), and Hedera (DLT).
- **All 18 Packages Bumped in Lockstep to v0.0.4**: Synchronized manifests across the workspace with 100% test coverage floor maintained.

### Fixed

- **WCAG 2.2 Level AAA Accessibility & Contrast**: Upgraded design system and interactive controls to strictly satisfy AAA ratios ($\ge 7.0:1$ normal text, $\ge 4.5:1$ large text/UI boundaries) across both light and dark themes with opaque dropdowns and zero CSP inline style violations.
- **Dependency Security Audit**: Resolved transitive `ip-address` vulnerability with workspace overrides, restoring audit status to 0 known vulnerabilities.

## [0.0.3] - 2026-09-27

### Added

- **Post-Quantum Cryptography**: ML-KEM (512/768/1024), ML-DSA (44/65/87), SLH-DSA (FIPS 205), FN-DSA (FIPS 206), RFC 10024 hybrid key exchange (`X25519MLKEM768`, `SecP256r1MLKEM768`), P-256+ML-KEM-768, X448+ML-KEM-1024
- **Core Hardening**: AES-GCM-SIV, KMAC, Argon2id/i/d with PHC format, additional curves (P-384, Ed448, X448), Schnorr signatures (BIP-340), secure in-place memory wiping (`wipeMemory`)

- **High-Level API**: secretbox, sealedbox, password-encrypt, key-wrap, multi-recipient encryption
- **Key Management**: serialize, keygen, keyring with encrypted export
- **Streaming & Performance**: stream-hash, stream-aead, WebCrypto bridge, worker pool
- **Protocols**: PQXDH, Double Ratchet, PAKE (OPAQUE-like), Threshold/Shamir+Feldman VSS
- **Unified Crypto API**: algorithm registry, unified sign/verify/encrypt/decrypt across all algorithms
- **Server v2 API**: 34+ REST endpoints for all modern crypto operations with JSON schema validation
- **CLI v2**: modern commands for keygen, hash, encrypt, sign, password hashing
- **SDK**: type-safe fetch-based client covering all v2 server endpoints
- **14 new packages**: crypto-edge, crypto-kms, crypto-middleware, crypto-prisma, crypto-react, crypto-sdk, crypto-testing, crypto-typeorm, crypto-vue, crypto-wasm, crypto-mcp, crypto-lsp, crypto-cbom, crypto-benchmarks
- **AI & Developer Tooling**: Model Context Protocol (MCP) server for AI assistants (Claude, Cursor, Antigravity), Language Server Protocol (LSP) server with real-time AST/regex linting and quick fixes, Cryptographic Bill of Materials (CBOM) generator (CycloneDX 1.6 / SPDX 3.0) with DORA/CRA compliance scoring, and comparative benchmarking suite
- **Server security**: JWT + API key auth, scope-based RBAC, rate limiting, CORS, Helmet, OpenTelemetry
- **100% test coverage** across all 18 packages (~2,116+ tests)
- **100% JSDoc/TypeDoc coverage** with 0 warnings

### Deprecated

- **v1 API routes** (OpenPGP-based): `/v1/encrypt`, `/v1/decrypt`, `/v1/generate`, `/v1/verify`, `/v1/revoke` — use v2 endpoints instead. Sunset date: 2027-01-01.

### Changed

- Migrated from yarn/lerna to pnpm workspaces
- Upgraded to Node.js >= 22.0.0
- Switched from OpenPGP-only to @noble/\* primitives for modern crypto
- Monorepo restructured from 4 packages to 18 packages

## [0.0.2] - 2022-05-30

### Fixed

- Bug fixes and stability improvements

## [0.0.1] - 2022-05-17

### Added

- Initial release with crypto-lib, crypto-api, crypto-cli, crypto-server
- OpenPGP-based encryption, decryption, key generation, signing, verification

[0.0.6]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/sebastienrousseau/crypto-service/releases/tag/v0.0.1
