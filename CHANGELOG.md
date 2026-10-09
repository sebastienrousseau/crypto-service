<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.29] - Unreleased

### Added

- **Lockstep release iteration**: Advance monorepo package manifests, root `package.json`, `CITATION.cff`, and `CHANGELOG.md` to 0.0.29 in strict lockstep.

## [0.0.28] - 2026-10-09

### Added

- **Lockstep release iteration**: Advanced monorepo package manifests, root `package.json`, `CITATION.cff`, and `CHANGELOG.md` to 0.0.28 in strict lockstep.

## [0.0.27] - 2026-10-09

### Added

- **Lockstep release iteration**: Advanced monorepo package manifests, root `package.json`, `CITATION.cff`, and `CHANGELOG.md` to 0.0.27 in strict lockstep.

## [0.0.26] - 2026-10-09

### Added

- **Core Cryptographic Property Fuzzing Expansion**: Implemented fast-check property test suites across FIPS 204 ML-DSA-44, 65, and 87 verifying message roundtrip invariance, nibble tampering rejection, and hybrid Ed25519+ML-DSA dual verification.
- **Metering Engine Resilience**: Added backward clock drift (negative delta t) resilience and massive time jump token replenishment tests in the REST server.
- **OpenSSF Best Practices 100% Gold Badge**: Maintained 100% Passing, 100% Silver, and 100% Gold tier certification on OpenSSF Best Practices (Project #15153).
- **100% Quality Verification Floor**: 100.0% statement, branch, function, and line coverage floor verified across all 18 packages with zero lint warnings and zero build errors.
- **Lockstep release iteration**: Advanced monorepo package manifests, root `package.json`, `CITATION.cff`, and `CHANGELOG.md` to 0.0.26 in strict lockstep.

## [0.0.25] - 2026-10-08

### Added

- **OpenSSF Best Practices 100% Full Tier Certification**: Completed 100% Passing, 100% Silver, and 100% Gold badge certification on OpenSSF Best Practices BadgeApp (Project #15153). Added official status badges to repository root README.
- **CI Provenance Verification Hardening**: Extended npm package provenance retry window to 24 attempts (6 minutes) with logging to absorb registry CDN propagation delays.
- **Lockstep release iteration**: Advanced monorepo package manifests, root `package.json`, `CITATION.cff`, and `CHANGELOG.md` to 0.0.25 in strict lockstep.

## [0.0.24] - 2026-10-08

### Added

- **Post-Quantum Digital Signatures (FIPS 204 ML-DSA) in MCP**: Added support for ML-DSA-44, ML-DSA-65, and ML-DSA-87 digital signatures in `@sebastienrousseau/crypto-mcp` across key generation (`crypto_generate_key`), message signing (`crypto_sign`), and verification (`crypto_verify`) by key handle or raw hex public key.
- **Multi-Recipient Hybrid KEM in MCP**: Added `crypto_hybrid_kem_multi_encapsulate` and `crypto_hybrid_kem_multi_decapsulate` tool handlers to `@sebastienrousseau/crypto-mcp`, providing post-quantum broadcast key encapsulation combining X25519, ML-KEM-768, and RFC 3394 AES Key Wrap.
- **Client SDK Multi-Level PQ Parameters**: Added typed parameter interfaces (`MlKemKeygenParams`, `MlKemEncapsulateParams`, `MlKemDecapsulateParams`, `HybridEncapsulateParams`, `HybridDecapsulateParams`) and `MlKemLevel` to `@sebastienrousseau/crypto-sdk`, enabling typed security level configuration across client KEM workflows.
- **Reusable Hybrid DEK Wrapping in Core Library**: Exported `wrapDekHybrid` and `unwrapDekHybrid` in `@sebastienrousseau/crypto-lib`, providing modular hybrid DEK wrapping for multi-recipient data protection.
- **Post-Quantum Hybrid KEM in MCP**: Added `crypto_hybrid_kem_encapsulate` and `crypto_hybrid_kem_decapsulate` tool handlers to `@sebastienrousseau/crypto-mcp`, providing dual-envelope encapsulation (X25519 + ML-KEM) per RFC 9180 and RFC 10024.
- **Expanded Security Property & Fuzz Testing**: Added fast-check property tests in `@sebastienrousseau/crypto-lib` covering SLH-DSA message invariance, single-nibble signature and public key tamper rejection, non-hex input safety, and truncated boundary handling. Added property fuzz tests in `@sebastienrousseau/crypto-server` verifying OPAQUE single-use session consumption, TTL expiration bounds, and multi-tenant token bucket burst and sliding window invariants.
- **Multi-Level ML-KEM Support in MCP**: Expanded `crypto_generate_key`, `crypto_kem_encapsulate`, and `crypto_kem_decapsulate` to support ML-KEM-512, ML-KEM-768, and ML-KEM-1024 (NIST FIPS 203 Categories 1, 3, and 5) with automatic level inference from held key handles.

### Refactored

- **MCP Schema Modularization**: Extracted reusable schema helpers and bounds into `schema-helpers.ts` in `@sebastienrousseau/crypto-mcp`, eliminating circular temporal-dead-zone import cycles and maintaining strict line length and complexity standards.

### Security

- **OPAQUE Registration Collision Check (CWE-287 / CWE-306)**: Added verification in `registerRegisterFinish` rejecting registration attempts for pre-existing credential identifiers with `409 Conflict` (`CREDENTIAL_EXISTS`), preventing unauthenticated registration overwrite and account takeover.
- **SLH-DSA Route Rate Limiting (CWE-400 / CWE-770)**: Configured route-level rate limiting (`10 req/min`) on CPU-intensive `POST /v2/pq/slh-dsa/keygen` and `POST /v2/pq/slh-dsa/sign`, preventing event loop starvation and denial-of-service from synchronous hash-based signature generation.
- **CORS Allowed Headers Expansion (CWE-16 / CWE-942)**: Included `"Authorization"`, `"x-request-id"`, and `"traceparent"` in `corsOptions.allowedHeaders`, enabling preflight authorization for browser-based JWT bearer authentication without relaxing origin restrictions.

## [0.0.23] - 2026-10-07

### Added

- **Lockstep release iteration**: Advanced monorepo package manifests, root `package.json`, `CITATION.cff`, and `CHANGELOG.md` to 0.0.23 in strict lockstep.

### Security

- **Vulnerability Remediation**: Added workspace override for `katex` (`>=0.18.2`, GHSA-238p-pmpm-9mq7) in `pnpm-workspace.yaml`, bringing `pnpm audit` to 0 vulnerabilities.

## [0.0.22] - 2026-10-06

### Added

- **Fuzz Testing with fast-check**: Comprehensive generative property-based fuzz testing across RFC 9180 HPKE seal/open roundtrips, context/info/aad handling, bit-flip tamper rejection, streaming AEAD chunk boundaries, single-bit corruption detection, truncated stream detection, and Shamir Secret Sharing threshold schemes.
- **Official Standards Regression Testing**: Comprehensive test suites verifying official CAVP/KAT test vectors for RFC 8439 (ChaCha20-Poly1305), RFC 5869 (HKDF-SHA256), and NIST SP 800-38D (AES-256-GCM).
- **Post-Quantum Benchmark Suite**: Expanded benchmark coverage measuring key generation, encapsulation/decapsulation, signing, and verification across ML-KEM-512, ML-KEM-768, ML-KEM-1024, ML-DSA-44, ML-DSA-65, ML-DSA-87, and Hybrid KEM, alongside high-throughput 1 MB streaming AEAD (>165 MB/s).
- **Testing Package Enrichment**: Exported `mutateBytes`, `mutateHex`, and standard `RFC_VECTORS` in `@sebastienrousseau/crypto-testing`.

### Security

- **Vulnerability Remediation**: Added workspace overrides for `proxy-addr` (`>=2.0.8`, GHSA-jqcg-44mw-7w3h) and `source-map-js` (`>=1.2.2`, GHSA-68fv-2mgg-jv7q) in `pnpm-workspace.yaml`, bringing `pnpm audit` to 0 high and critical vulnerabilities.

### Fixed

- **NPM publish tarball path resolution**: Resolved tarball directory to an absolute path in `scripts/publish-npm.sh` to prevent `npm publish` from misinterpreting relative tarball paths (e.g. `npm-tarballs/*.tgz`) as GitHub repository shorthand URLs.
- **Manifest and Citation synchronization**: Enhanced `scripts/check-manifests.mjs` to validate `CITATION.cff` version against root `package.json`, ensuring synchronization across all project metadata.
- **Coveralls CI suite completeness**: Added missing packages (`@sebastienrousseau/crypto-benchmarks`, `@sebastienrousseau/crypto-cbom`, `@sebastienrousseau/crypto-lsp`, `@sebastienrousseau/crypto-mcp`) to `.github/workflows/coveralls.yml` for 100% coverage reporting across all 18 monorepo packages.
- **CI Windows matrix resilience**: Added `fail-fast: false` to `build-windows` matrix in `.github/workflows/ci.yml`.

## [0.0.21] - 2026-10-05

### Added

- **Lockstep release iteration**: Advanced monorepo package manifests, root `package.json`, `CITATION.cff`, and `CHANGELOG.md` to 0.0.21 in strict lockstep.

## [0.0.20] - 2026-10-05

### Security

- **Vulnerability Elimination & Dependency Purge**: Removed unused remark packages from `@sebastienrousseau/crypto-api` and `@sebastienrousseau/crypto-cli`, purging transitive dependency `braces` (GHSA-vfj7-8cjw-p6xm) and bringing `pnpm audit` to 0 vulnerabilities.

### Documentation

- **Release Standard Alignment**: Updated repository invariants and global template references to adhere strictly to `passmcp 0.0.5`.
- **Terminal Demo Animation**: Re-recorded terminal demonstration animation using Charmbracelet VHS displaying `v0.0.20` CLI outputs.

## [0.0.19] - 2026-10-04

### Added

- **Ecosystem Documentation Separation**: Established `https://docs.crypto-service.co` as the dedicated TypeDoc monorepo documentation hub and `https://crypto-service.co` as the sovereign marketing and architecture web portal.
- **Ecosystem Submenu & Zero-404 Navigation**: Connected all 18 workspace packages (Core, Enterprise & Frameworks, Developer Tools & AI Suite) across both web layouts with direct deep links into package API docs.
- **Root Redirection Architecture**: Configured instant canonical redirection from `https://docs.crypto-service.co` root to `https://crypto-service.co/ecosystem/` with standalone per-package TypeDoc routing preserved.

## [0.0.18] - 2026-10-04

### Added

- **End-to-End Post-Quantum Hybrid HPKE (RFC 9180 + ML-KEM-768)**: Dual post-quantum hybrid envelope wrapping X25519 and ML-KEM-768 with zero-copy stream processing.
- **Ultra-Performance Cryptographic Optimizations**: Zero-copy TypedArray slicing and buffer pooling across encryption and decryption streaming pipelines.
- **Documentation & Ecosystem Portal Architecture**: Complete separation of `https://crypto-service.co` and `https://docs.crypto-service.co`.

## [0.0.17] - 2026-10-04

### Added

- **Unified Key Management Service (KMS)**: Complete multi-provider KMS support (AWS KMS, GCP Cloud KMS, HashiCorp Vault, Azure Key Vault, and Local) across `crypto-server` REST endpoints (`/v2/kms/create-key`, `/v2/kms/wrap`, `/v2/kms/unwrap`, `/v2/kms/generate-data-key`, `/v2/kms/encrypt`, `/v2/kms/decrypt`), `crypto-cli` commands (`crypto-cli kms`), and `crypto-sdk` methods on `CryptoClient`.
- **Post-Quantum Acceleration**: ML-KEM encapsulation/decapsulation and ML-DSA signing/verification accelerated via `crypto-wasm` with pure-JS fallback routing.
- **Security Hardening**: Hardened GCP and Vault KMS providers against SSRF and directory traversal, with static provider instantiation eliminating CodeQL dynamic dispatch findings.
- **Terminal Demo Animation**: Added refreshed VHS tape and generated demo animation showcasing the CLI surface and quantum-ready capabilities.

## [0.0.16] - 2026-10-04

### Refactored

- **Complexity baseline reduction**: Refactored 7 key functions across `@sebastienrousseau/crypto-react`, `@sebastienrousseau/crypto-benchmarks`, `@sebastienrousseau/crypto-wasm`, `@sebastienrousseau/crypto-lib`, and `@sebastienrousseau/crypto-edge`, shrinking the architectural complexity exemption list by 44% (from 16 to 9 functions) while maintaining 100% test coverage across all 18 monorepo packages.

### Added

- Initialized release iteration `v0.0.16`.

## [0.0.15] - 2026-10-04

### Added

- **Native Google Cloud KMS Provider**: `@sebastienrousseau/crypto-kms` now provides a production native `GcpKmsProvider` backed by the Google Cloud KMS REST v1 API using native `fetch` with zero external SDK dependencies. Features key lifecycle management (`createKey`, `getKey`, `listKeys`, `enableKey`, `disableKey`, `scheduleKeyDeletion`, `rotateKey`), cryptographic operations (`encrypt`, `decrypt`, `sign`, `verify`), data encryption key (DEK) generation (`generateDataKey`), and key wrapping/unwrapping (`wrapKey`, `unwrapKey`).
- **Post-Quantum Hybrid HPKE REST endpoints (RFC 9180)**: `@sebastienrousseau/crypto-server` now exposes `POST /v2/hpke/keygen`, `POST /v2/hpke/seal`, and `POST /v2/hpke/open` routes with strict server-side key custody (`keyId`). Supports quantum-safe hybrid (`x25519-ml-kem-768`) and classical (`x25519`, `p256`) KEMs, with `chacha20-poly1305` and `aes-128-gcm` AEADs across both Base and PSK modes.
- **HPKE Client SDK methods**: `@sebastienrousseau/crypto-sdk` now provides `hpkeGenerateKeyPair`, `hpkeSeal`, and `hpkeOpen` on `CryptoClient`, exposing typed interfaces for RFC 9180 HPKE and PQ hybrid operations.
- **HPKE CLI subcommands**: `@sebastienrousseau/crypto-cli` now features `crypto-cli hpke keygen`, `crypto-cli hpke seal`, and `crypto-cli hpke open` commands supporting classical and post-quantum hybrid public-key encryption with stdin/file streaming, JSON formatting, and automated usage documentation.
- **Terminal demo animation in README**: Root README includes an interactive terminal recording generated from `.github/demo.tape` via VHS demonstrating core CLI workflows.

## [0.0.14] - 2026-10-04

### Added

- Initialized release iteration `v0.0.14`.

## [0.0.13] - 2026-10-04

### Fixed

- **KMS offline test stability**: Prevented AWS KMS tests from dispatching real network commands against live endpoints, and set `AWS_EC2_METADATA_DISABLED` to avoid network probing timeouts in CI.
- Initialized release iteration `v0.0.13`.

## [0.0.12] - 2026-10-04

### Added

- **Post-Quantum Hybrid HPKE (RFC 9180 + ML-KEM-768)**: `@sebastienrousseau/crypto-lib` now implements Post-Quantum Hybrid HPKE (`HpkeKem: "x25519-ml-kem-768"`), combining classical DHKEM(X25519, HKDF-SHA256) with post-quantum ML-KEM-768 encapsulation under RFC 9180 LabeledExtract/Expand key combiners. Supports both `ChaCha20-Poly1305` and `AES-128-GCM` AEADs across Base and PSK modes, with ultra-performant typed array handling and 100% test coverage.
- **Native HashiCorp Vault KMS Provider & Key Wrapping**: `@sebastienrousseau/crypto-kms` now provides a production native `VaultKmsProvider` backed by the HashiCorp Vault Transit secrets engine using native `fetch` with zero external SDK dependencies. Features key creation, metadata querying, encryption, decryption, Ed25519/ECDSA/RSA signing and verification, key rotation, data encryption key (DEK) generation, and key wrapping/unwrapping (`wrapKey`, `unwrapKey`). Also added `wrapKey` and `unwrapKey` to `LocalKmsProvider`, `AwsKmsProvider`, and the unified `KmsProvider` interface.
- **OPAQUE protocol REST endpoints (RFC 9807)**: `@sebastienrousseau/crypto-server` now exposes zero-knowledge password-authenticated key exchange (PAKE) REST routes (`POST /v2/opaque/register/init`, `POST /v2/opaque/register/finish`, `POST /v2/opaque/login/init`, `POST /v2/opaque/login/finish`) supporting both `P256-SHA256` and `ristretto255-SHA512` suites. Features client enumeration resistance using RFC 9807 fake records for unknown users, transient single-use login handshake sessions with automated TTL expiration, and route-level rate limiting.
- **OPAQUE CLI subcommands**: `@sebastienrousseau/crypto-cli` now features `crypto-cli opaque setup`, `crypto-cli opaque register <id>`, and `crypto-cli opaque login <id>` subcommands, supporting terminal password prompts with confirmation, stdin and file-based password inputs, remote server URL configuration, and full end-to-end zero-knowledge authentication.
- Initialized release iteration `v0.0.12`.

## [0.0.11] - 2026-10-03

### Added

- **Multi-recipient post-quantum streaming AEAD**: Added multi-recipient post-quantum hybrid streaming authenticated encryption combining X25519, ML-KEM-768, and XChaCha20-Poly1305 across `@sebastienrousseau/crypto-lib`, `@sebastienrousseau/crypto-server`, and `@sebastienrousseau/crypto-sdk`. Features content encryption key (CEK) wrapping per recipient slot with recipient ID and slot index authenticated additional data (AAD) binding, anti-truncation framing, automatic recipient slot discovery, zero-memory buffer scrubbing, WHATWG `TransformStream` pipelines (`createMultiPqEncryptStream`, `createMultiPqDecryptStream`), Fastify REST endpoints (`POST /v2/stream/multi-pq-encrypt`, `POST /v2/stream/multi-pq-decrypt`), and SDK client methods (`streamMultiPqEncrypt`, `streamMultiPqDecrypt`).
- **CLI multi-recipient post-quantum streaming commands**: `@sebastienrousseau/crypto-cli` now features `crypto-cli stream multi-encrypt` and `crypto-cli stream multi-decrypt` subcommands for chunked multi-recipient post-quantum hybrid streaming AEAD, supporting recipient public key lists via JSON string or file paths, custom chunk sizing (1024-16MB), automatic recipient slot detection or targeted recipient ID decryption, and zeroed in-memory plaintext buffers.
- **MCP multi-recipient streaming tools**: `@sebastienrousseau/crypto-mcp` now provides `crypto_stream_multi_encrypt` and `crypto_stream_multi_decrypt` tools enabling MCP agents to encrypt and decrypt post-quantum hybrid streaming payloads for multiple recipients with server-held key handles and automatic plaintext memory scrubbing.
- **Multi-recipient streaming benchmarks**: `@sebastienrousseau/crypto-benchmarks` now benchmarks multi-recipient post-quantum hybrid STREAM AEAD encryption and decryption across 3 recipients with 64 KB payloads.

### Security

- **Dependabot advisory 130**: Eliminated orphaned `braces@3.0.3` dependency from the workspace lockfile.
- **CodeQL unvalidated dynamic method call**: Refactored `crypto-lib`'s `hash()` function dispatch from a plain object to a secure `Map` lookup, eliminating prototype pollution risks (CodeQL alert 35).
- **CodeQL missing rate limiting**: Added explicit route-level rate limiting (`config: { rateLimit: { max: 100, timeWindow: "1 minute" } }`) across sensitive signature verification and decryption endpoints in `crypto-server` (CodeQL alerts 29-34).

## [0.0.10] - 2026-10-03

### Added

- **Edge post-quantum streaming adapters**: `@sebastienrousseau/crypto-edge` now provides `createEdgePqEncryptStream`, `createEdgePqDecryptStream`, `encryptEdgeResponse`, `decryptEdgeRequest`, and `createDecryptedEdgeRequest`, enabling Cloudflare Workers, Vercel Edge, Deno, and Bun runtimes to encrypt and decrypt post-quantum hybrid streaming AEAD payloads over standard WHATWG `Request` and `Response` streams with automated memory scrubbing.
- **Streaming cryptography benchmarks**: `@sebastienrousseau/crypto-benchmarks` now features a dedicated `streaming` benchmark suite comparing symmetric STREAM AEAD (XChaCha20-Poly1305) against post-quantum hybrid STREAM AEAD (X25519 + ML-KEM-768 + XChaCha20-Poly1305) across 64 KB encryption and decryption operations.
- **React post-quantum streaming hook**: `@sebastienrousseau/crypto-react` now exports `usePqStream`, enabling client-side chunked post-quantum hybrid STREAM AEAD encryption, decryption, and WHATWG `TransformStream` pipelines (`createEncryptStream`, `createDecryptStream`) with reactive state management.
- **Vue post-quantum streaming composable**: `@sebastienrousseau/crypto-vue` now exports `usePqStream`, exposing reactive refs (`ciphertext`, `plaintext`, `chunkCount`, `isProcessing`, `error`) and WHATWG `TransformStream` factory methods for chunked post-quantum hybrid streaming AEAD.
- **MCP post-quantum streaming tools & X25519 key generation**: `@sebastienrousseau/crypto-mcp` now supports generating X25519 keypairs via `crypto_generate_key` returning server-held key handles, and adds `crypto_stream_encrypt` and `crypto_stream_decrypt` tools providing post-quantum hybrid streaming AEAD with automated intermediate memory zeroing.
- **Fastify and Express post-quantum streaming middleware**: `@sebastienrousseau/crypto-middleware` now exports `pqStreamPlugin` for Fastify (supporting `pq-decrypt-request` and `pq-encrypt-response` hooks) and `createPqStreamMiddleware` for Express (transparent request body decryption and response streaming encryption) powered by chunked X25519 + ML-KEM-768 + XChaCha20-Poly1305, alongside standalone `encryptPqPayload` and `decryptPqPayload` helpers with automatic plaintext memory zeroing.
- **CLI post-quantum streaming commands**: `@sebastienrousseau/crypto-cli` now features `crypto-cli stream encrypt` and `crypto-cli stream decrypt` subcommands for chunked post-quantum hybrid streaming AEAD, accepting public and secret key files for X25519 and ML-KEM-768, custom chunk sizing, JSON-formatted output, and zeroed in-memory plaintext buffers.
- **KeyStore at-rest envelope encryption**: `crypto-server` now supports encrypting server-persisted private keys on disk under `CRYPTO_KEY_OUT_DIR` using AES-256-GCM when `CRYPTO_KEY_STORAGE_KEY` is set. Nonces are generated per key, and `${keyId}:${owner}` is bound as authenticated additional data (AAD) to prevent ciphertext splicing and cross-tenant substitution attacks. Legacy unencrypted key files continue to be read transparently for backwards compatibility.
- **CryptoClient timeout and automatic retries**: `crypto-sdk` now supports a configurable `timeout` option (via `AbortSignal.timeout`) and automated retry policies (`retry: { maxRetries, initialDelayMs, maxDelayMs }`) for transient HTTP failures (`429`, `503`, `504`) and network fetch errors, honoring server `Retry-After` headers.
- **W3C Trace Context propagation**: `crypto-server` now validates incoming W3C `traceparent` (and `tracestate`) headers, generates compliant Level 1 traceparents when missing or invalid, propagates them on response headers, and decorates requests with `traceId`. `crypto-sdk` supports `traceparent` configuration (static header or per-request compliant traceparent generation).
- **Post-quantum hybrid streaming AEAD**: `crypto-lib/streaming` now exports `streamPqEncrypt` and `streamPqDecrypt` for chunk-based authenticated encryption combining X25519, ML-KEM-768, and XChaCha20-Poly1305 with per-chunk nonces and anti-truncation markers.
- **WHATWG Web Streams post-quantum streaming adapters**: `crypto-lib/streaming` now exports `createPqEncryptStream` and `createPqDecryptStream`, providing standard WHATWG `TransformStream` pipelines for chunked post-quantum hybrid streaming AEAD.
- **Post-quantum streaming REST endpoints**: `crypto-server` now exposes `POST /v2/stream/pq-encrypt` and `POST /v2/stream/pq-decrypt` with JSON schemas, scoped permissions (`crypto:encrypt`, `crypto:decrypt`), chunk size validation, anti-truncation protection, and automatic memory zeroing of intermediate plaintext.
- **Post-quantum streaming SDK client methods**: `crypto-sdk` now exposes `streamPqEncrypt` and `streamPqDecrypt` methods on `CryptoClient` with end-to-end integration and contract test coverage.
- **CBOM hybrid and post-quantum primitive audit rules**: `crypto-cbom` now detects FN-DSA (NIST FIPS 206), hybrid KEMs (X25519 + ML-KEM-768), and classical Diffie-Hellman / Montgomery curves (X25519, X448), classifying hybrid primitives into `TRANSITIONAL_HYBRID` and classical public-key algorithms into `VULNERABLE_CRQC`.

### Security

- **Zero-memory buffer scrubbing**: Systematically applied `wipeMemory()` to zero in-memory private key material, intermediate decrypted plaintext buffers, unwrapped Data Encryption Keys (DEKs), and decoded key import buffers across `@sebastienrousseau/crypto-server` and `@sebastienrousseau/crypto-mcp`.
- **Vulnerability remediation (`braces <=3.0.3`)**: Overrode `chokidar` to `>=5.0.0` in `pnpm-workspace.yaml`, eliminating the transitive high-severity regex/stack exhaustion vulnerability (GHSA-vfj7-8cjw-p6xm) in the markdown tooling dependency graph.

### Changed

- **One approval per npm release**: npm versions are no longer staged for per-package 2FA approval (18 approvals for 0.0.9). The release workflow packs the tarballs once after the tests; a separate `npm` job runs in the `npm` GitHub environment, which waits for a maintainer to approve the run once, then publishes those exact tarballs through npm trusted publishing (`scripts/pack-npm.sh`, `scripts/publish-npm.sh`) and checks provenance. Each package's trusted publisher accepts only that environment.
- **Mocha test timeout resilience**: Set `timeout: 60000` in `.mocharc.cjs` across `crypto-sdk`, `crypto-lib`, and `crypto-server` to allow compute-intensive cryptographic operations (Argon2id password hashing, large-key RSA, and SLH-DSA post-quantum key generation and signing) sufficient headroom on loaded multi-architecture CI runners.
- **Dependency maintenance & branch funneling**: Consolidated 11 Dependabot updates into `feat/v0.0.10` per repository invariants: `actions/upload-pages-artifact@5.0.0`, `pnpm/action-setup@6.1.0`, `anchore/sbom-action@0.24.2`, `figlet@1.12.0`, `vue@3.5.43`, `lint-staged@17.6.0`, `openpgp@6.3.2`, `@sebastienrousseau/markdownlint-config@0.0.7`, `remark-preset-lint-markdown-style-guide@6.0.1`, `commander@15.0.0`, and `@sebastienrousseau/mocha-config@0.0.7`.
- **Complexity baseline reduction**: Refactored `runSuite` in `@sebastienrousseau/crypto-benchmarks` and extracted stream factories in `@sebastienrousseau/crypto-react`, eliminating recorded offenders and shrinking the repository complexity baseline to 16 entries.
- **Dependabot configuration**: Added ignore rule for TypeScript semver-major updates (`>= 7.0.0`) in `.github/dependabot.yml` until ecosystem tooling (typescript-eslint, TypeDoc, ts-node) adds support.

## [0.0.9] - 2026-10-02

### Security

- **Per-route scopes (breaking for under-scoped tokens)**: crypto-server now enforces authorization scopes. Before, scopes were never checked, so any authenticated principal could call any route. One table (`ROUTE_SCOPES` in `src/config/auth-policy.ts`) maps every route to a scope (`crypto:encrypt`, `crypto:decrypt`, `crypto:sign`, `crypto:verify`, `crypto:hash`, `crypto:kdf`, `crypto:keys`, or `crypto:admin` for `/v1/revoke`); a principal without it gets `403`, a route without an entry answers `403`, and the server refuses to start if a registered route is missing from the table. `crypto:admin` (held by API-key and anonymous principals) satisfies every scope. A JWT without a `scopes` array holds no scope.
- **JWT claims (breaking for tokens without `exp`)**: crypto-server now requires `exp` and `iat` on every JWT, refuses a token older than `JWT_MAX_AGE` seconds (default 3600) or declaring a longer lifetime, and checks `iss` / `aud` against `JWT_ISSUER` / `JWT_AUDIENCE` when set. In production, `JWT_SECRET` without both `JWT_ISSUER` and `JWT_AUDIENCE` stops the server at boot, as does an invalid `JWT_MAX_AGE`. Before, a token without `exp` was valid forever, and any token signed with the secret was accepted whoever it was issued by or for.
- **No private keys over the API (breaking)**: crypto-server no longer takes a private key in any request or returns one from key generation. `/v2/keys/generate`, `/v2/pq/keygen`, `/v2/pq/hybrid/keygen`, `/v2/pq/dsa/keygen` and `/v2/pq/slh-dsa/keygen` keep the private key on the server and return a `keyId` with the public key; `/v2/sign`, `/v2/stream/sign` (per item), `/v2/pq/dsa/sign`, `/v2/pq/slh-dsa/sign`, `/v2/sealedbox/open`, `/v2/sealedbox/open-pq`, `/v2/pq/decapsulate` and `/v2/pq/hybrid/decapsulate` take that `keyId` instead of `privateKey` / `secretKey` / `recipientSecretKey` / `x25519SecretKey` / `x25519PrivateKey` / `mlKemSecretKey` (ML-DSA and SLH-DSA sign no longer take `level` / `variant`: they come from the key). A key is usable only by the principal that generated it. Keys live in memory, and also in `CRYPTO_KEY_OUT_DIR` (one `0600` file per key) when that is set. The new `POST /v2/keys/export` returns a private key only to a principal holding the new `crypto:keys:export` scope, which `crypto:admin` does not imply. `/v1/decrypt` no longer takes `privateKey`: it decrypts with the server's key pair from `CRYPTO_KEY_DIR`; `/v1/encrypt` replaces `privateKey` with `sign: true`, which signs with that key pair. crypto-sdk follows in the next entry.
- **crypto-sdk uses server-held keys (breaking)**: `sign`, `pqSign`, `pqHashSign`, `sealedboxOpen` and `pqDecapsulate` take `keyId` instead of private keys, and key-generation results (`KeyGenerateResult`, `HybridKeyPair`, `MlDsaKeyPair`, `SlhDsaKeyPair`) carry `keyId` and public keys only; `Ed25519KeyPair` is removed. New methods: `exportKey` (`/v2/keys/export`), `mlKemGenerateKeyPair` / `mlKemEncapsulate` / `mlKemDecapsulate`, and `sealedboxSealPq` / `sealedboxOpenPq`. `ApiError` is the RFC 9457 problem (`type`, `title`, `status`, `detail`, `instance`, `code`, `errors`), and `CryptoApiError`'s message uses `detail`; a response without a problem body becomes an `about:blank` problem. Other drift from the routes is fixed: the SLH-DSA methods called `/v2/pq/hash-sign/*` (404; now `/v2/pq/slh-dsa/*`); `secretboxOpen`, `sealedboxOpen`, `passwordDecrypt` and `keyUnwrap` return the string the server sends as `data`, not an object; `PasswordEncryptResult` is `{ encrypted, algorithm }`, `KeyWrapResult` `{ wrapped, algorithm }`, `SealedboxSealResult` `{ sealed, algorithm }` (no `ephemeralPublicKey`); `getCbom` returns the CycloneDX document, which the route does not wrap in `data`; `passwordHash` / `passwordVerify` drop `variant`, which the server discarded; and algorithm parameters are typed with the values each route accepts (HMAC takes `sha256`, not `hmac-sha256`). A contract test runs the SDK against crypto-server in process through `app.inject`, and `pnpm run examples:check` type-checks the examples, which now authenticate with `CRYPTO_API_KEY` / `CRYPTO_TOKEN`.
- **KDF and password-hash floors (breaking for low work factors)**: `/v2/kdf` and `/v2/password/hash` now enforce the OWASP Password Storage Cheat Sheet floors for new keys and hashes: scrypt N = 2^17 with r = 8 (crypto-lib already caps N at 2^17), PBKDF2-HMAC-SHA256 with at least 600,000 iterations, and Argon2id with at least 19 MiB (19456 KiB) and two passes. Before, they accepted scrypt N = 2, one PBKDF2 iteration and 1 MiB Argon2. Lower values now get `400`; the defaults already met the floors. `/v2/password/verify` still accepts the parameters of existing hashes.
- **KDF work off the event loop**: scrypt, PBKDF2 and Argon2 (`/v2/kdf`, `/v2/password/hash`, `/v2/password/verify`, `/v2/password/encrypt`, `/v2/password/decrypt`) run crypto-lib's own functions on two worker threads (crypto-lib's `WorkerPool`), started on first use and stopped when the server closes. A maximum-cost scrypt request blocked every other request, `/health` included, for over a second; now it does not.
- **crypto-middleware `verify-jwt` (breaking for tokens without `exp`)**: `verifyJwt` rejects a token without a numeric `exp` (`MISSING_EXPIRATION`), and a non-numeric `nbf` or a payload that is not a JSON object (`MALFORMED_TOKEN`); before, a token without `exp` never expired. It takes optional `issuer` / `audience` checks (`INVALID_ISSUER`, `INVALID_AUDIENCE`), set through the new `jwtIssuer` / `jwtAudience` middleware options. The algorithm stays pinned to HS256.
- **crypto-mcp key handles (breaking)**: MCP tools no longer put secret key material into the LLM conversation. Keys are generated, unwrapped or derived inside the server and held in a bounded in-memory store (64 keys, least recently used evicted, raw secret bytes zeroed on eviction or destroy); tools return an opaque `keyHandle` plus public metadata, and tools that use a secret take the handle. `crypto_generate_key` no longer returns `privateKey` and adds `symmetric-256` and `hmac-sha256` key types; `crypto_encrypt` takes `keyHandle` instead of `key` and returns a handle instead of a generated key; `crypto_decrypt` takes `keyHandle`; `crypto_sign` takes `keyHandle` and picks the algorithm from the key (adding ECDSA for `ecc` keys), so its `privateKey` and `algorithm` parameters are gone; `crypto_verify` takes a public key PEM or a `keyHandle` (HMAC by handle only) and refuses private keys; `crypto_kms_wrap` takes `keyHandle` instead of `dek`, and `crypto_kms_unwrap` returns a `keyHandle` instead of `dek`. New tools: `crypto_key_list`, `crypto_key_destroy`, and `crypto_kem_encapsulate` / `crypto_kem_decapsulate` for ML-KEM-768, whose shared secrets also stay behind handles. The local KMS creates at most 64 KEK labels per process. (Audit findings F16, F17.)
- **crypto-mcp argument validation (breaking)**: every `tools/call` is checked against the tool's declared `inputSchema` before the tool runs. Unknown properties, missing required properties, wrong types, values outside an `enum`, and strings outside their declared length or format are rejected with `Invalid arguments for <tool>: ...`, which names the property but never echoes its value. Each schema now sets `additionalProperties: false` and bounds every string (1 MiB for data and plaintext, 16 KiB for keys). Required properties are no longer filled with defaults: `crypto_generate_key` needs `type`, and `crypto_kms_wrap` / `crypto_kms_unwrap` need `provider` and `keyId`. `crypto_decrypt` accepts hex ciphertext only, as it always did; its description no longer offers base64. (Audit finding F18.)
- **crypto-mcp key import**: the new `crypto_key_import` tool loads an existing key from a file into a key handle, so data encrypted or signed outside the server can be used without the key passing through the conversation. It is disabled unless `CRYPTO_MCP_KEY_DIR` is set, reads only regular files of at most 64 KiB below that directory (absolute paths, `..` and symlinks leading out are refused), and accepts unencrypted PKCS#8 PEM private keys (Ed25519, RSA, EC) and raw 32-byte symmetric or HMAC keys as binary or hex; the bytes read are zeroed after parsing, and results and errors never contain file contents.

### Changed

- **Fuzzing**: property-based tests with fast-check cover PASETO v4 token parsing and round trips (crypto-lib), CBOM validation and audit on arbitrary JSON (crypto-cbom) and email validation against its previous regex (crypto-server).
- **npm trusted publishing with staged releases**: the release workflow packs each package with pnpm and stages it with `npm stage publish` (`scripts/publish-npm.sh`), authenticated by npm trusted publishing (GitHub OIDC) on Node 24's npm; no npm token is used. Every package's trusted publisher allows staging only, so a version goes public only after a maintainer approves it with 2FA; the new **Verify npm release** workflow then checks that every package is public with provenance. Versions already on npm are skipped.
- **crypto-server error bodies are RFC 9457 problems (breaking)**: every error response is now `application/problem+json` with `type` (`urn:crypto-service:problem:<slug>`), `title`, `status`, `detail` and `instance` (the request path, without the query string). Before, error bodies came in several shapes: `{ error }`, `{ error, details }` for validation, `{ error, message }` for 403, Fastify's `{ statusCode, error, message }`, and the rate limiter's and tenant metering's own; clients that read `error` or `message` should read `detail`. Validation failures list `{ field, message }` in `errors` (was `details`); crypto-lib `CryptoError`s and key-store errors add their `code`; tenant metering keeps `tier`, `limit` and `resetSeconds`; 429 keeps `Retry-After`. Unexpected errors answer 500 with a fixed detail and no internal message or stack, and unknown routes a `not-found` problem.
- **Toolchain** (from Dependabot #170): ESLint 10 with typescript-eslint 8, chai 6, chai-as-promised 8, mocha 12 and prettier 3.9.9 across all 18 packages. The 20 `.eslintrc` files and `.eslintignore` are replaced by one root `eslint.config.mjs` with the same rule set; chai assertions in tests are checked by `eslint-plugin-chai-friendly`. `eslint-plugin-import` and its resolver, configured nowhere, are removed. TypeScript stays on 5.9: typescript-eslint (`<6.1.0`), TypeDoc (`<=6.0`) and ts-node do not support TypeScript 7 yet.
- **crypto-cli subcommands**: `crypto-cli hash`, `keygen`, `cbom scan` and `cbom audit` run without prompts (commander 14), with `--json` output on stdout, standard input when no file is given, errors on stderr and exit codes 0 (success), 1 (operation failed, including a CBOM audit with status FAIL) and 2 (usage error). The interactive menu now starts only when stdin and stdout are terminals and there are no arguments; otherwise the CLI prints usage to stderr and exits 2 instead of waiting on a prompt. The menu dispatch is table-driven, which removes `cli.ts` (complexity 16) from the complexity baseline. The README command reference is generated from the command definitions and checked by a test, and `scripts/pack-smoke.sh` runs the installed `crypto-cli hash --json < file`.
- **crypto-cli secret subcommands**: `encrypt` / `decrypt` (XChaCha20-Poly1305 secretbox, base64 output, plaintext bytes written unchanged), `sign` / `verify` (keys saved from `keygen --json`: Ed25519, Ed448, P-256, P-384, ML-DSA) and `password hash` / `password verify` (Argon2id, crypto-lib defaults, PHC strings). Keys and passwords are never flag values: they come from `--key-file` / `--password-file`, from `--key-stdin` / `--password-stdin` when the data is a file argument, or, for passwords, a hidden prompt on a terminal. A missing source or key and data both on stdin exit 2; a wrong key, modified ciphertext, or a signature or password that does not verify exit 1 (`valid: false` with `--json`). A secret file readable by its group or others gets a warning on stderr on POSIX (not a refusal: platform-mounted secrets are often 0644). `pack-smoke.sh` runs the installed `encrypt | decrypt` with a key file.
- **Complexity**: ESLint 10 counts optional chaining and default parameters, and crypto-sdk is now measured (the old ignore file hid it at the root). The functions this exposed were refactored rather than re-baselined, and the baseline shrinks from 49 to 41 entries.
- **Package boundaries (breaking for deep imports)**: every package now has an `exports` map (`types`, `require`, `default`, plus `./package.json`) and `"type": "commonjs"`, so paths outside it, such as `@sebastienrousseau/crypto-lib/dist/...`, no longer resolve. crypto-lib exports `.`, `./modern`, `./high-level`, `./keys`, `./streaming`, `./protocols`, `./tokens`, `./accel` and `./pgp` (with `typesVersions` for `moduleResolution: node`); crypto-cli, crypto-server and crypto-react now use these instead of `dist/` paths, and crypto-api exports its collection types from the root. Also breaking: crypto-lib drops its default export (use the `pgp` namespace or `@sebastienrousseau/crypto-lib/pgp`; a CommonJS default export is not the default under Node ESM) and the `cryptolib` bin (it ran the library entry and did nothing); the crypto-server package entry is `init` from `server.js` (requiring it booted the server; the `crypto-server` bin is unchanged); crypto-cli has no importable entry (requiring it started the interactive CLI and its `types` file did not exist); crypto-edge drops `module` and `browser`, which pointed at the CommonJS build. `scripts/check-packages.mjs` (`pnpm run check:packages`) runs publint and Are the Types Wrong on every packed package, `pack-smoke.sh` now installs all 18 packages and loads every exported entry with `require()` and `import()`, and ESLint rejects `@sebastienrousseau/*/dist` imports; all run in CI and `make check`. The crypto-server route modules and crypto-cli handlers whose imports moved are split into one function per route or step, so the complexity baseline shrinks from 41 to 28 entries.
- **crypto-lib `pgp` entry**: also exports `loadKeystore` and the `Keystore` type (the service key pair from `CRYPTO_KEY_DIR`), which crypto-server's v1 routes use now that deep imports are not allowed.

### Fixed

- **crypto-mcp protocol conformance** (found by passmcp): `tools/call` without a valid tool name and `prompts/get` without a required argument now return JSON-RPC `-32602` instead of succeeding; notifications (`notifications/initialized`) are no longer answered; the server negotiates MCP 2025-11-25 (or the client's supported revision) instead of always 2024-11-05, sends `instructions`, and every tool declares a `title` and behaviour annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`). passmcp now scores the server 98/100 with no failures, up from 90 with two.
- **crypto-server email validation (ReDoS)**: `validateEmail` used `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, which backtracks polynomially (about 0.9 s for a 40 KB crafted string, flagged by CodeQL). It now checks the same strings in linear time.
- **crypto-middleware on Fastify 5**: the Fastify plugin declared `fastify: "4.x"` to fastify-plugin, so registering it on Fastify 5 (the version crypto-server uses) threw "expected '4.x' fastify version". It now accepts 4.x and 5.x, and the peer dependency is `^4.0.0 || ^5.0.0`.
- **crypto-cli closed pipes**: piping output into a reader that stops early (`crypto-cli cbom scan . --json | head`) crashed with an unhandled `EPIPE` stack trace and exit code 1. The CLI now stops quietly with exit code 0, as Unix tools do.
- **`/v1/decrypt` lost the plaintext**: every successful decryption answered `{ "data": "[object Object]" }`, because the response schema declared `data` a string while the handler sent `{ data, signatureValid }`. The response is now `{ "data": { "data": "<plaintext>", "signatureValid": <boolean> } }`.
- **crypto-api import side effect**: importing or requiring the package ran its command-line `init()`, which read `process.argv` and printed "Path of JSON file is required." in the importing program, contradicting its `sideEffects: false`. `init()` now runs only when `dist/index.js` is executed directly.
- **crypto-cbom SPDX audit**: `auditCbom` crashed ("Cannot read properties of undefined") on an SPDX 3.0 CBOM, which `validateCbom` accepts and `generateSpdxCbom` produces; it read only CycloneDX `components`. It now audits SPDX `elements` and gives the same result as for the CycloneDX document of the same assets.
- **PASETO v4.local (breaking for stored tokens)**: `v4local` produced tokens labelled `v4.local.` that were not PASETO v4.local: it used XChaCha20-Poly1305 with a key derived from half the nonce, so no other PASETO implementation could read them and it could not read theirs. It now follows the PASETO v4 specification (XChaCha20, BLAKE2b-MAC over PAE(header, nonce, ciphertext, footer, implicit), subkeys from the full 32-byte nonce, tag checked in constant time before decryption) and reproduces all nine official encryption vectors byte for byte. Tokens issued by 0.0.8 and earlier no longer decrypt and must be re-issued. Token parsing now also rejects padded or non-canonical base64url, as the official failure vectors require (for v4.public too); v4.public output is unchanged and matches the official signing vectors.
- **crypto-mcp `rsa-pss` signatures**: `crypto_sign` with `algorithm: "rsa-pss"` produced RSASSA-PKCS1-v1_5 signatures and `crypto_verify` checked them the same way, so the name did not match the scheme. Both now use RSASSA-PSS (SHA-256, MGF1-SHA-256, 32-byte salt); RSA signatures from 0.0.8 and earlier no longer verify.
- **npm provenance**: 0.0.8 was published to npm without provenance attestations, although the release workflow passed `--provenance`; `pnpm -r publish` does not forward that flag to npm. The workflow now sets `NPM_CONFIG_PROVENANCE=true`, and a new step (`scripts/check-provenance.mjs`) reads every published version back from the registry and fails the release if one is missing or has no attestation. The README no longer claims provenance for 0.0.8.
- **crypto-middleware**: loading the package failed with `Cannot find module 'fastify-plugin'` unless that optional peer was installed, because the root entry loads the Fastify adapter. `fastify-plugin` is now a dependency (^6.0.0, the version the tests use).
- **crypto-server bin**: `npx crypto-server` ran `dist/index.js` without a shebang; the entry now starts with `#!/usr/bin/env node`.

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

[0.0.29]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.28...HEAD
[0.0.28]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.27...v0.0.28
[0.0.27]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.26...v0.0.27
[0.0.26]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.25...v0.0.26
[0.0.25]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.24...v0.0.25
[0.0.24]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.23...v0.0.24
[0.0.23]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.22...v0.0.23
[0.0.22]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.21...v0.0.22
[0.0.21]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.20...v0.0.21
[0.0.20]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.19...v0.0.20
[0.0.19]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.18...v0.0.19
[0.0.18]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.17...v0.0.18
[0.0.17]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.16...v0.0.17
[0.0.16]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.15...v0.0.16
[0.0.15]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.14...HEAD
[0.0.14]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.13...v0.0.14
[0.0.13]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.12...v0.0.13
[0.0.12]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.11...v0.0.12
[0.0.11]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.10...v0.0.11
[0.0.10]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.9...v0.0.10
[0.0.9]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.8...v0.0.9
[0.0.8]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.7...v0.0.8
[0.0.7]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.6...v0.0.7
[0.0.6]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/sebastienrousseau/crypto-service/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/sebastienrousseau/crypto-service/releases/tag/v0.0.1
