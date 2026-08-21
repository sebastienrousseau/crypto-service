# Architecture

## Package Dependency Graph

```text
crypto-lib (core)
├── crypto-server (REST API via Fastify)
│   └── crypto-sdk (client SDK)
├── crypto-cli (command-line interface)
├── crypto-edge (edge runtime polyfills)
├── crypto-kms (key management: AWS/Azure/GCP/Vault/Local)
├── crypto-middleware (Express/Fastify encryption middleware)
├── crypto-prisma (Prisma encrypted field decorators)
├── crypto-typeorm (TypeORM encrypted column decorators)
├── crypto-react (React hooks for browser crypto)
├── crypto-vue (Vue composables for browser crypto)
├── crypto-testing (test utilities and fixtures)
├── crypto-wasm (WASM crypto bindings)
└── crypto-api (API documentation generator)
```

All packages except `crypto-sdk` and `crypto-api` depend on `crypto-lib` as
their core cryptographic engine. `crypto-sdk` is a standalone fetch-based HTTP
client that talks to `crypto-server`. `crypto-api` is a documentation tool with
no runtime crypto dependency.

## Core Design Decisions

### Cryptographic Primitives

- All modern crypto via `@noble/*` (audited, pure-JS, zero-dependency)
- Legacy PGP via `openpgp` (v1 API only, deprecated)
- Post-quantum: ML-KEM (FIPS 203), ML-DSA (FIPS 204), SLH-DSA (FIPS 205),
  FN-DSA (FIPS 206)
- Hybrid schemes: X25519+ML-KEM-768, P-256+ML-KEM-768, X448+ML-KEM-1024
- HPKE (RFC 9180) with X25519 and P-256 cipher suites

### Acceleration Layers

Located in `crypto-lib/src/accel/`:

| Module               | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| webcrypto-bridge.ts  | Hardware-accelerated AES-GCM and SHA-2 via SubtleCrypto |
| native-pqc-bridge.ts | Node.js 24.7+ OpenSSL 3.5 ML-KEM/ML-DSA                 |
| wasm-bridge.ts       | Ready for awasm-noble (10 GB/s BLAKE3)                  |
| worker-pool.ts       | Offload CPU-intensive operations to worker threads      |

### Security Model

- Constant-time comparisons for all secret data (`timingSafeEqual`)
- `SecureBuffer` for key material with zeroization on GC
- Random nonce generation (no nonce reuse)
- AEAD-only encryption (no unauthenticated modes)
- Argon2id for password hashing (OWASP 2025 parameters)
- `Cache-Control: no-store` on all v2 server responses

### API Versioning

- **v1:** Legacy OpenPGP-based (deprecated — emits `Deprecation`, `Sunset`,
  and `Link` headers). Will be removed in a future major release.
- **v2:** Modern @noble-based (current, recommended).

## Module Categories

### Modern Crypto (`src/modern/`)

| Module          | Algorithms                             |
| --------------- | -------------------------------------- |
| aead.ts         | XChaCha20-Poly1305                     |
| aes.ts          | AES-128/256-GCM, AES-GCM-SIV           |
| hash.ts         | SHA-2, SHA-3, BLAKE2b, BLAKE3          |
| signing.ts      | Ed25519, Ed448                         |
| curves.ts       | P-256, P-384, Schnorr (BIP-340)        |
| ecdh.ts         | X25519, X448                           |
| kdf.ts          | HKDF, PBKDF2, scrypt                   |
| mac.ts          | HMAC, KMAC                             |
| password.ts     | Argon2id/i/d (PHC string format)       |
| pq-kem.ts       | ML-KEM-512/768/1024, hybrids           |
| pq-sign.ts      | ML-DSA-44/65/87                        |
| pq-hash-sign.ts | SLH-DSA (all parameter sets)           |
| fn-dsa.ts       | FN-DSA-512/1024 (FALCON, FIPS 206)     |
| hpke.ts         | HPKE (RFC 9180) — X25519, P-256 suites |
| pq.ts           | Unified PQ entry point (re-exports)    |

### High-Level API (`src/high-level/`)

| Module              | Purpose                                 |
| ------------------- | --------------------------------------- |
| secretbox.ts        | Symmetric authenticated encryption      |
| sealedbox.ts        | Anonymous public-key encryption         |
| password-encrypt.ts | Password-based encryption (Argon2+AEAD) |
| key-wrap.ts         | Key wrapping (X25519 + AES-KW/KWP)      |
| multi-recipient.ts  | Multi-recipient envelope encryption     |

### Protocols (`src/protocols/`)

| Module       | Purpose                                      |
| ------------ | -------------------------------------------- |
| pqxdh.ts     | Post-Quantum Extended Triple Diffie-Hellman  |
| ratchet.ts   | Double Ratchet (Signal-like forward secrecy) |
| pake.ts      | PAKE (OPAQUE-like password-authenticated KE) |
| threshold.ts | Shamir Secret Sharing + Feldman VSS          |

### Streaming (`src/streaming/`)

| Module         | Purpose                                    |
| -------------- | ------------------------------------------ |
| stream-aead.ts | Chunked AEAD encryption/decryption         |
| stream-hash.ts | Incremental hashing (SHA-2/3, BLAKE)       |
| web-streams.ts | Web Streams API (TransformStream) wrappers |

### Key Management (`src/keys/`)

| Module       | Purpose                                    |
| ------------ | ------------------------------------------ |
| keygen.ts    | Key pair generation for all algorithms     |
| serialize.ts | Key serialization (hex, base64, JWK)       |
| keyring.ts   | In-memory keyring with expiry and rotation |

### Unified API (`src/crypto.ts`)

Single-entry-point facade that dispatches to the appropriate modern module based
on an algorithm registry. Exposes `encrypt`, `decrypt`, `sign`, `verify`,
`hash`, `kdf`, `mac`, `kem`, and `keygen` — each accepting an algorithm name
string.

## Server Architecture

```
crypto-server
├── src/
│   ├── config/
│   │   ├── constants.ts    — algorithm lists, limits
│   │   └── env.ts          — environment variable parsing
│   ├── lib/
│   │   ├── auth.ts         — API key + JWT authentication
│   │   └── telemetry.ts    — request tracing, logging
│   ├── routes/
│   │   ├── probes.ts       — /healthz, /readyz
│   │   ├── v1/             — legacy PGP routes (deprecated)
│   │   └── v2/             — modern routes
│   │       ├── algorithms.ts
│   │       ├── encrypt.ts
│   │       ├── hash.ts
│   │       ├── kdf.ts
│   │       ├── pq.ts
│   │       └── signing.ts
│   └── index.ts            — Fastify app bootstrap
```

All v2 routes use Fastify JSON Schema validation with
`additionalProperties: false`. Security headers via `@fastify/helmet`. Rate
limiting via `@fastify/rate-limit`.

## Testing Strategy

- **Framework:** Mocha + Chai, coverage via c8
- **Target:** 100% statement, branch, and function coverage across all 14
  packages (~2023 tests total)
- **Techniques:**
  - Override `crypto.subtle` getter to test WebCrypto bridge fallbacks
  - Low-cost Argon2 parameters (`memoryCost: 1024, timeCost: 1`) in tests
  - `prompts.inject()` + write stubs for CLI command testing
  - Schema-valid but crypto-invalid payloads to cover server catch blocks
  - `c8 ignore` annotations for unreachable guards (worker threads,
    probabilistic zero-scalar checks, peer-dep not-installed catches)

## Node.js Compatibility

| Node Version | Status       | Notes                      |
| ------------ | ------------ | -------------------------- |
| 22.x LTS     | Tested in CI | Minimum supported          |
| 24.x         | Tested in CI | Native PQC via OpenSSL 3.5 |
