# Migration Guide: v0.0.2 to v0.0.3

## Breaking Changes

### v1 API Deprecated

All v1 routes now return `Deprecation`, `Sunset`, and `Link` headers via a
Fastify `onSend` hook. The v1 endpoints still function but will be removed in a
future major release. Migrate to v2 endpoints.

| v1 Route          | v2 Replacement                      |
| ----------------- | ----------------------------------- |
| POST /v1/encrypt  | POST /v2/encrypt                    |
| POST /v1/decrypt  | POST /v2/encrypt (decrypt mode)     |
| POST /v1/generate | POST /v2/signing/keygen             |
| POST /v1/sign     | POST /v2/signing/sign               |
| POST /v1/verify   | POST /v2/signing/verify             |
| POST /v1/revoke   | (removed — manage keys client-side) |

### Error Classification

Some errors that previously returned HTTP 500 now return 400 when the input is
invalid (e.g., malformed hex keys, unsupported algorithm names). Update your
error handling if you rely on status codes.

### New Dependencies

- `@noble/post-quantum` added (PQC algorithms)
- `@noble/ciphers` upgraded to ^2.2.0 (AES-GCM-SIV support)

## New Features

### Post-Quantum Cryptography

All PQC modules live in `crypto-lib/src/modern/`:

- **ML-KEM** (FIPS 203) — Key encapsulation at 512/768/1024 security levels
- **ML-DSA** (FIPS 204) — Lattice-based digital signatures (44/65/87)
- **SLH-DSA** (FIPS 205) — Hash-based stateless signatures (all parameter sets)
- **FN-DSA** (FIPS 206) — FALCON lattice signatures (512/1024)
- **HPKE** (RFC 9180) — Hybrid Public Key Encryption with X25519/P-256 suites
- **Hybrid KEM** — X25519+ML-KEM-768, P-256+ML-KEM-768, X448+ML-KEM-1024

### High-Level APIs

Opinionated wrappers in `crypto-lib/src/high-level/`:

- `secretbox` / `secretboxOpen` — symmetric authenticated encryption
  (XChaCha20-Poly1305)
- `sealedbox` / `sealedboxOpen` — anonymous public-key encryption (X25519 +
  XChaCha20-Poly1305)
- `passwordEncrypt` / `passwordDecrypt` — password-based encryption (Argon2id +
  XChaCha20-Poly1305)
- `keyWrap` / `keyUnwrap` — X25519 ECDH + AES-KW/KWP key wrapping
- `multiEncrypt` / `multiDecrypt` — multi-recipient envelope encryption

### Protocols

Production-grade protocol implementations in `crypto-lib/src/protocols/`:

- **PQXDH** — Post-Quantum Extended Triple Diffie-Hellman key agreement
- **Double Ratchet** — Forward-secret messaging (Signal-like)
- **PAKE** — OPAQUE-like password-authenticated key exchange
- **Threshold** — Shamir Secret Sharing + Feldman Verifiable Secret Sharing

### Streaming

Streaming cryptography in `crypto-lib/src/streaming/`:

- `stream-aead` — chunked XChaCha20-Poly1305 encryption/decryption
- `stream-hash` — incremental SHA-2/SHA-3/BLAKE hashing
- `web-streams` — Web Streams API (`TransformStream`) wrappers

### Key Management

Key lifecycle utilities in `crypto-lib/src/keys/`:

- `keygen` — unified key pair generation for all supported algorithms
- `serialize` — hex, base64, and JWK serialization
- `keyring` — in-memory keyring with expiry and rotation

### Unified Crypto API

`crypto-lib/src/crypto.ts` provides a single-entry-point facade with an
algorithm registry. Call `encrypt("xchacha20-poly1305", ...)` or
`sign("ed25519", ...)` without importing individual modules.

### Acceleration

- **WebCrypto bridge** — hardware-accelerated AES-GCM and SHA-2
- **Native PQC bridge** — Node.js 24.7+ OpenSSL 3.5 ML-KEM/ML-DSA
- **WASM bridge** — ready for awasm-noble
- **Worker pool** — offload CPU-intensive operations to worker threads

### Server Improvements

- `Cache-Control: no-store` on all `/v2/` responses
- Error classification: 400 for bad input, 500 for internal failures
- Rate limiting on password hashing endpoints (5 req/minute)
- Request tracing via `x-request-id` header
- Security headers via `@fastify/helmet`

### Additional Algorithms

- **AES-GCM-SIV** — nonce-misuse-resistant AEAD
- **KMAC** — Keccak-based MAC
- **Schnorr** — BIP-340 signatures (secp256k1)
- **Argon2i/d** variants and PHC string format (`verifyPasswordPhc`)
- **X448** key exchange and Ed448 signatures

### SDK

`crypto-sdk` now has full method coverage for all v2 endpoints — encryption,
hashing, signing, KDF, PQC KEM, and algorithm listing.

### CLI

New `modern` subcommands for all v2 operations: encrypt, decrypt, hash, sign,
verify, keygen, kdf, pq-kem, pq-sign.

## Upgrade Steps

1. **Update dependencies:**

   ```bash
   pnpm update @sebastienrousseau/crypto-lib @sebastienrousseau/crypto-server
   ```

2. **Replace v1 route calls with v2 equivalents** (see table above). The v1
   routes still work but emit deprecation headers.

3. **Update error handling.** Some 500 responses are now 400 for invalid input.
   Check for both status codes in your error handling logic.

4. **Adopt high-level APIs** where appropriate. If you are manually combining
   `ecdh` + `aead` for encryption, consider using `sealedbox` instead.

5. **Review new TypeDoc documentation.** All 14 packages now have 100% JSDoc
   coverage. Run `pnpm docs` in any package to generate HTML docs.
