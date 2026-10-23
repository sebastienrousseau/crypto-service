<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Security Policy

## Supported Versions

Only the latest published release receives security fixes. All 18
packages are released together under one version, so "latest" means the
same version for every package.

## Reporting a Vulnerability

We take the security of Crypto Service Suite seriously. If you discover a
security vulnerability, please report it responsibly.

**Email:** [security@crypto-service.co](mailto:security@crypto-service.co)

**GitHub:** [report a vulnerability privately](https://github.com/sebastienrousseau/crypto-service/security/advisories/new)
through GitHub's private vulnerability reporting.

Please include:

- A description of the vulnerability
- Steps to reproduce the issue
- The affected package(s) and version(s)
- Any potential impact assessment

We will acknowledge receipt within 48 hours and aim to provide an initial
assessment within 5 business days. We will coordinate disclosure timelines
with you and credit reporters (unless anonymity is preferred).

**Do not** open public GitHub issues for security vulnerabilities.

## Threat Model

### In Scope

- **Key material exposure:** Unintended leakage of private keys, shared
  secrets, or passwords through logs, error messages, responses that can
  be cached, files left on disk, or timing side channels.
- **Cryptographic misuse:** Weak defaults, algorithm downgrade, nonce
  reuse, or a verification that reports success for input it did not
  check, in the library or the server APIs.
- **Authentication and authorization bypass:** Circumventing API-key or
  JWT authentication, or a route's required scope.
- **Tenant isolation:** One principal using or deleting another's
  server-held keys, KMS keys or OPAQUE registrations. Keys and KMS keys
  belong to the principal that created them; anonymous mode
  (`ALLOW_ANONYMOUS=1`) has a single principal and is single-tenant.
- **Keys at rest:** Weak protection of keys persisted under
  `CRYPTO_KEY_OUT_DIR` (encrypted with AES-256-GCM under
  `CRYPTO_KEY_STORAGE_KEY`).
- **Resource exhaustion by one client:** Exhausting key stores, worker
  pools, OPAQUE state or memory with requests that are each within the
  rate limit.
- **Input validation flaws:** Malformed inputs causing crashes, memory
  exhaustion, or undefined behavior in cryptographic operations.
- **Agent tools (crypto-mcp):** A prompt-injected MCP client causing key
  material to leave the server. Wrapping an existing key to a
  client-supplied recipient needs `MCP_ALLOW_KEY_EXPORT=1`.
- **Dependency vulnerabilities:** Known CVEs in direct dependencies
  (@noble/\*, openpgp, Fastify, argon2).

### Out of Scope

- Denial of service through request volume alone (mitigated by rate
  limiting).
- An operator, or anyone with write access to the host, the key
  directory or the server's environment.
- Actions a KMS provider takes with the server's own cloud identity, once
  the operator has enabled that provider in `KMS_PROVIDERS`.
- Social engineering or phishing.
- Vulnerabilities in the underlying operating system or Node.js runtime
  (report those upstream).

## Supported Algorithms

### Modern (v2 API)

- **Symmetric encryption:** XChaCha20-Poly1305, AES-256-GCM, AES-128-GCM,
  AES-256-GCM-SIV, AES-128-GCM-SIV
- **Hashing:** SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-512, BLAKE2b, BLAKE3
- **Key derivation:** Argon2id/i/d, scrypt, HKDF-SHA256, PBKDF2-SHA256
  (deprecated)
- **Signatures:** Ed25519, Ed448, ECDSA-P256, ECDSA-P384, Schnorr (BIP-340),
  Composite ML-DSA-44/65 with Ed25519 (hybrid)
- **Key exchange:** X25519, X448, ECDH-P256, ECDH-P384
- **MAC:** HMAC-SHA256/384/512, HMAC-SHA3-256/512, KMAC128/256
- **Post-quantum:** ML-KEM-512/768/1024 (FIPS 203), ML-DSA-44/65/87 (FIPS 204),
  SLH-DSA (FIPS 205), FN-DSA-512/1024 (FIPS 206)
- **Hybrid KEM:** X25519 with ML-KEM-512, -768 or -1024, P-256+ML-KEM-768,
  X448+ML-KEM-1024
- **HPKE:** RFC 9180 Base and PSK modes, single-shot, with DHKEM(X25519),
  DHKEM(P-256) or X-Wing (X25519 + ML-KEM-768, KEM `0x647A`), each with
  ChaCha20Poly1305 or AES-128-GCM
- **High-level:** Secretbox, Sealed Box, password encryption, key wrapping
  (AES-KW/KWP), multi-recipient encryption
- **Protocols:** PQXDH, Double Ratchet, PAKE (RFC 9807 OPAQUE-3DH), Threshold/Shamir+Feldman VSS

`GET /v2/algorithms` lists each algorithm with its status (recommended,
acceptable or deprecated). [docs/ALGORITHMS.md](docs/ALGORITHMS.md) says
which to use for each job.

### Deprecated (v1 API)

The v1 routes use OpenPGP (via the openpgp library) for key generation,
encryption, decryption, verification and revocation, with the server's
single keystore, so they are single-tenant. They send `Deprecation` and
`Sunset` headers and may be removed after 1 January 2027;
`V1_ENABLED=0` removes them now. [MIGRATION.md](MIGRATION.md) lists the v2
replacement for each.

## Security Controls

crypto-server applies these to every deployment; the
[crypto-server README](packages/crypto-server/README.md) documents each
setting.

- **Authentication fails closed:** Every route except the probes, the API
  documentation and the OPAQUE login steps needs an API key or a JWT.
  With neither configured, only `ALLOW_ANONYMOUS=1` lets requests in, and
  a production server refuses to start without a credential unless it is
  set. Each route requires a scope from one central policy; a route
  without a policy entry answers 403.
- **Rate limiting:** Per client, `RATE_LIMIT_MAX` requests a minute
  (default 10); some routes set their own limit, and password hashing
  allows 5 a minute. Probes are exempt.
- **Bounded work:** Request bodies are limited to 256 KiB; each principal
  may hold `KEY_STORE_MAX_PER_PRINCIPAL` keys (default 1000); KDF and
  post-quantum signing run on bounded worker pools that answer 503 when
  full; OPAQUE records and login sessions are bounded.
- **Cache-Control:** Every response except the static API documentation
  under `/docs` carries `Cache-Control: no-store` and `Pragma: no-cache`.
- **Input validation:** Fastify JSON Schema validation on route bodies,
  plus per-field checks in each route.
- **Errors:** Every error is an RFC 9457 problem document. Invalid input
  answers 4xx; internal failures answer 500 without their cause.
- **Security headers:** @fastify/helmet sets HSTS, X-Frame-Options,
  X-Content-Type-Options and related headers. Content-Security-Policy is
  off, because the API serves JSON; the Swagger UI at `/docs` is served
  without one, and `DOCS_ENABLED=0` removes it.
- **CORS:** Off unless `CORS_ORIGIN` lists the allowed origins.
- **Logging:** Credentials, key material and passwords are redacted from
  logs. A client's `x-request-id` is used only if it is 1 to 128
  characters from `[A-Za-z0-9._-]`; otherwise the server generates one.
- **Audit log:** Key generation, export, deletion and use, KMS calls and
  OPAQUE registration each write an `audit` log line naming the
  principal, the key or provider and the outcome, refused requests
  included, without key material.
- **Configuration:** Every setting is validated at startup, and the
  server refuses to start with an invalid one.

## Library-Level Security

- **Validation status:** No module in this suite is FIPS 140-3 validated.
  The post-quantum algorithms (FIPS 203/204/205 and FN-DSA) come from
  `@noble/post-quantum`, which has not been independently audited and does
  not guarantee constant-time execution.
- **Secret comparisons:** crypto-lib exports a constant-time
  `timingSafeEqual`, used by the PAKE (OPAQUE) MAC and envelope checks and
  the API-key check. Not every comparison in the codebase has been audited
  for constant-time behaviour.
- **Zeroization is limited:** `SecureBuffer` zeroes its contents only when
  `destroy()` is called explicitly, and crypto-lib's own APIs do not use it.
  Most APIs accept and return keys as hex strings or ordinary buffers, which
  JavaScript cannot reliably wipe.
- **Random nonces:** All AEAD operations generate random nonces internally;
  the API does not accept caller-supplied nonces.
- **AEAD-only:** No unauthenticated encryption modes are exposed.
- **Argon2id defaults:** Password hashing defaults to memoryCost 65536
  (64 MiB), timeCost 3 and parallelism 4.
