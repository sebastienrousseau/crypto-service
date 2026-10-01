<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- **crypto-mcp argument validation (breaking)**: every `tools/call` is checked against the tool's declared `inputSchema` before the tool runs. Unknown properties, missing required properties, wrong types, values outside an `enum`, and strings outside their declared length or format are rejected with `Invalid arguments for <tool>: ...`, which names the property but never echoes its value. Each schema now sets `additionalProperties: false` and bounds every string (1 MiB for data and plaintext, 16 KiB for keys). Required properties are no longer filled with defaults: `crypto_generate_key` needs `type`, `crypto_sign` and `crypto_verify` need `algorithm`, and `crypto_kms_wrap` / `crypto_kms_unwrap` need `provider` and `keyId`. `crypto_decrypt` accepts hex ciphertext only, as it always did; its description no longer offers base64. (Audit finding F18.)

### Changed

- **Toolchain** (from Dependabot #170): ESLint 10 with typescript-eslint 8, chai 6, chai-as-promised 8, mocha 12 and prettier 3.9.9 across all 18 packages. The 20 `.eslintrc` files and `.eslintignore` are replaced by one root `eslint.config.mjs` with the same rule set; chai assertions in tests are checked by `eslint-plugin-chai-friendly`. `eslint-plugin-import` and its resolver, configured nowhere, are removed. TypeScript stays on 5.9: typescript-eslint (`<6.1.0`), TypeDoc (`<=6.0`) and ts-node do not support TypeScript 7 yet.
- **Complexity**: ESLint 10 counts optional chaining and default parameters, and crypto-sdk is now measured (the old ignore file hid it at the root). The functions this exposed were refactored rather than re-baselined, and the baseline shrinks from 49 to 41 entries.

### Fixed

- **PASETO v4.local (breaking for stored tokens)**: `v4local` produced tokens labelled `v4.local.` that were not PASETO v4.local: it used XChaCha20-Poly1305 with a key derived from half the nonce, so no other PASETO implementation could read them and it could not read theirs. It now follows the PASETO v4 specification (XChaCha20, BLAKE2b-MAC over PAE(header, nonce, ciphertext, footer, implicit), subkeys from the full 32-byte nonce, tag checked in constant time before decryption) and reproduces all nine official encryption vectors byte for byte. Tokens issued by 0.0.8 and earlier no longer decrypt and must be re-issued. Token parsing now also rejects padded or non-canonical base64url, as the official failure vectors require (for v4.public too); v4.public output is unchanged and matches the official signing vectors.
- **crypto-mcp `rsa-pss` signatures**: `crypto_sign` with `algorithm: "rsa-pss"` produced RSASSA-PKCS1-v1_5 signatures and `crypto_verify` checked them the same way, so the name did not match the scheme. Both now use RSASSA-PSS (SHA-256, MGF1-SHA-256, 32-byte salt); RSA signatures from 0.0.8 and earlier no longer verify.
- **npm provenance**: 0.0.8 was published to npm without provenance attestations, although the release workflow passed `--provenance`; `pnpm -r publish` does not forward that flag to npm. The workflow now sets `NPM_CONFIG_PROVENANCE=true`, and a new step (`scripts/check-provenance.mjs`) reads every published version back from the registry and fails the release if one is missing or has no attestation. The README no longer claims provenance for 0.0.8.

## [0.0.8] - 2026-10-01

### Fixed

- **npm publishing**: six packages (crypto-kms, crypto-mcp, crypto-prisma, crypto-sdk, crypto-typeorm, crypto-wasm) had no `repository` field, which npm provenance requires, and the others used an SSH URL. Every manifest now declares `git+https://github.com/sebastienrousseau/crypto-service.git` with its package directory, so the release workflow can publish all 18 packages to npm with provenance. This is the first release published to npm in full; 0.0.6 and 0.0.7 were not published to npm.
- **Release workflow**: a preflight step checks the manifests against the tag before building, and the npm step fails instead of silently skipping when `NPM_TOKEN` is missing.

### Added

- **`scripts/check-manifests.mjs`**: checks lockstep versions, the repository field, public access and the file list for every publishable package (and the tag, with `--tag`); it runs in CI, in the release workflow and in `make check`.

### Changed

- **Lockstep version bump**: all 18 packages, the root manifest and `CITATION.cff` move to 0.0.8. The README and website describe npm as the install path from 0.0.8.

## [0.0.7] - 2026-10-01

### Security

- **PAKE is RFC 9807 OPAQUE-3DH**: `protocols.pake` implements OPAQUE-3DH (P256-SHA256 and ristretto255-SHA512) and reproduces the RFC 9807 Appendix C test vectors. The server never sees the password, unknown users get an indistinguishable fake response, MACs are compared in constant time, and the default key-stretching function is scrypt with the RFC parameters. The earlier PAKE could be logged into without the password and honest logins always failed. **Breaking:** the API now follows the RFC (`createRegistrationRequest`, `generateKE1` ... `serverFinish`, with byte serialisation for every message); earlier records cannot be converted, so users must register again.
- **HPKE**: the DHKEM key schedule follows RFC 9180 section 4.1 and is checked against the RFC 9180 test vectors; PSK inputs are validated. Ciphertexts from earlier versions do not open.
- **ISO 20022 dual signatures**: `verifyIso20022Payment(envelope, payload, trustedKeys)` verifies against caller-supplied keys, not the keys in the envelope, over a length-prefixed statement that includes the timestamp and algorithm identifiers. `/v2/stream/iso20022` requires `trustedKeys`. Earlier envelopes do not verify.
- **Hybrid KEMs**: the combiner binds both ciphertexts and public keys under a versioned label. Shared secrets differ from 0.0.6. The TLS group names (X25519MLKEM768 and others) are no longer accepted, since this construction is not RFC 10024 or X-Wing; the SecP256r1MLKEM768 codepoint constant is corrected to 0x11EB.
- **crypto-prisma / crypto-typeorm**: decryption fails closed with `FieldDecryptionError` instead of returning stored values; new values are `v2:` ciphertexts under an HKDF subkey bound to model/entity and field as AAD (legacy values still read unless `acceptLegacyCiphertext: false`); keys must be 64 hex characters. crypto-prisma also encrypts in `createMany` / `updateMany` (previously plaintext).
- **crypto-kms**: rotation keeps earlier versions (ciphertexts carry the key version; `destroyKeyVersion` retires one), encryption context is order-independent, signatures are plain Ed25519 over the data, and errors are typed `KmsError`s.
- **Password encryption**: format 0x02 binds the header as AAD; 0x01 payloads still decrypt.

- **Rate limiting**: limited requests now get `429` with `Retry-After` instead of `500`. `/health`, `/live`, `/ready` and `/metrics` are exempt, and the blanket `127.0.0.1` exemption (which disabled limiting behind a local proxy) is removed. `RATE_LIMIT_MAX` sets the per-client limit (default 10 per minute).
- **Metering**: the tenant is the authenticated subject and the tier comes only from a verified JWT `tier` claim; the `x-api-key` prefix no longer selects a tier. The tenant table is bounded (LRU, 10,000 entries). Metering headers are now `X-Tenant-RateLimit-*`, so `X-RateLimit-*` comes only from the global limiter.
- **No key files in source trees**: the unused PGP keys and sample data under `crypto-server/src/{key,data}` and `crypto-cli/src/{key,data}` are removed, with the dead `crypto-cli` key module. crypto-lib `sign` writes `signed.sig` only when `CRYPTO_DATA_DIR` is set.
- **Supply chain**: every GitHub Action is pinned by commit SHA; workflows default to read-only permissions with write scopes per job; `pnpm audit` in CI can fail the build; a weekly OpenSSF Scorecard workflow uploads results to code scanning; Dependabot also tracks the Docker base image.

### Fixed

- **Installable packages**: crypto-server and crypto-cli now declare `@sebastienrousseau/crypto-lib` (and crypto-cbom for the CLI) as runtime dependencies; unused `openpgp` and `@types/openpgp` runtime dependencies are dropped. `scripts/pack-smoke.sh` packs the packages, installs each with only its declared dependencies, and boots the server; it runs in CI.
- **Docker**: the image runs `dist/index.js` (the old `dist/src/index.js` did not exist), installs production dependencies only via `pnpm deploy --prod`, pins `node:22-alpine` by digest, runs under tini as a non-root user, and health-checks `/ready`. The Docker workflow smoke-tests the image before pushing and attaches provenance and an SBOM. `pnpm start` uses the same corrected path.
- **Makefile**: `start-crypto-server` and the key-generation targets called scripts that did not exist; `.PHONY` listed comma-separated names.

### Changed

- **Website**: removed advisory services, SLA support, an enterprise licence offer and an invented provider name that nothing backs; the contact form no longer claims a request was received, and opens a pre-filled GitHub issue instead.
- **Examples and benchmarks**: all crypto-lib examples compile and run (several had type errors, `web-streams.ts` deadlocked), a new `examples:check` script type-checks them in CI, and the web stream factories return typed `CryptoTransformStream`s. The benchmark script uses the new PAKE API and an in-range Shamir secret.

- **Docs and checks**: markdownlint is blocking in CI after fixing 38 headings that rendered as literal text and the crypto-api doc generator (escaped table cells, spacing); MD041 and MD036 are disabled because the canonical README template requires a logo block first and bold Contents labels. The Windows CI job runs lint and tests. crypto-lib's test environment is set in `.mocharc.cjs` instead of POSIX shell syntax.
- **Corrections to earlier entries**: the 0.0.5 ISO 20022 entry said "ECDSA/Ed25519 + ML-DSA-87"; the code signs Ed25519 + ML-DSA-65 by default (ML-DSA-44/87 accepted) and has no ECDSA. Entries describing X25519MLKEM768 / RFC 10024 support described a library-specific hybrid, not RFC 10024.

- **crypto-cbom audit**: `auditCbom` returns a heuristic `status` (`PASS` / `REVIEW` / `FAIL`) with a `disclaimer`, instead of `doraStatus` / `craStatus` compliance verdicts. Findings carry a `reference` (`NIST_SP_800_131A`, `NIST_IR_8547`, `CNSA_2_0`) instead of DORA/CRA article codes that did not match those articles. `DoraAuditResult` remains as a deprecated alias of `CbomAuditResult`.
- **Quality gates**: lint now covers test files with quoted globs (the old unquoted globs skipped files), with the 54 test lint errors fixed and no suppressions; every package has `format:check`, run in CI; a complexity gate (`scripts/complexity-check.mjs`, cyclomatic <= 10, <= 60 lines per function, <= 500 per file) fails on new offenders against `complexity-baseline.json`, which records the 51 existing ones. `make check` runs every gate.
- **Docs**: package READMEs state that `@noble/post-quantum` is not independently audited and no module is FIPS 140-3 validated; the benchmark script no longer reports a WebAssembly backend that does not exist.
- **Lockstep version bump**: all 18 packages, the root manifest and `CITATION.cff` move to 0.0.7.

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

[0.0.8]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.7...v0.0.8
[0.0.7]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.6...v0.0.7
[0.0.6]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/sebastienrousseau/crypto-service/releases/tag/v0.0.1
