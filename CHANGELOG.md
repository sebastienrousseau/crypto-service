<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.5] - 2026-09-29

### Added

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

[0.0.5]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/sebastienrousseau/crypto-service/releases/tag/v0.0.1
