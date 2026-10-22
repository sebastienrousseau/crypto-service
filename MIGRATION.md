<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Migration Guide

## Moving off the v1 API

The v1 routes wrap OpenPGP and act on the server's single keystore
(`CRYPTO_KEY_DIR`), so every caller signs, decrypts and revokes with the
same key: they are single-tenant. They were deprecated on 2026-08-21 and
may be removed after their sunset date, 1 January 2027.

Each v1 response says so: `Deprecation: @1787270400` (RFC 9745),
`Sunset: Fri, 01 Jan 2027 00:00:00 GMT` (RFC 8594) and a `Link` to this
page with `rel="deprecation"`. The OpenAPI document marks the v1
operations deprecated. `V1_ENABLED=0` removes the v1 routes before then.

| v1 route            | v2 replacement                                    | Note                                                             |
| ------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| `POST /v1/encrypt`  | `POST /v2/hpke/seal` or `POST /v2/sealedbox/seal` | v2 does not produce OpenPGP messages                             |
| `POST /v1/decrypt`  | `POST /v2/hpke/open` or `POST /v2/sealedbox/open` |                                                                  |
| `POST /v1/generate` | `POST /v2/keys/generate`                          | The key belongs to the caller, not to the server                 |
| `POST /v1/verify`   | `POST /v2/verify`, `POST /v2/pq/dsa/verify`       | Sign with `POST /v2/sign` or `POST /v2/pq/dsa/sign`              |
| `POST /v1/revoke`   | `POST /v2/keys/delete`                            | v2 deletes the caller's key; it issues no revocation certificate |

## Upgrading to 0.0.36

These changes can break a caller; [CHANGELOG.md](CHANGELOG.md) has the
detail.

- **PGP `verify`** returns `{ verified, data, keyIDs }`, and throws (or
  answers `400` on `/v1/verify`) for input that carries no signature.
  Check `verified`; a fulfilled call or a `200` no longer means anything
  else.
- **Hybrid KEM routes** use crypto-lib's v2 combiner
  (`crypto-service/hybrid-kem/v2` in each response). Derive shared secrets
  with `hybridKemEncapsulate`/`hybridKemDecapsulate`, not the deprecated
  `hybridEncapsulate`/`hybridDecapsulate`.
- **SDK `negotiateAlgorithm`** throws `AlgorithmNegotiationError` instead
  of falling back to classical X25519, and selects X25519 only with
  `allowClassical: true`.
- **crypto-server settings** are validated at startup: numbers must be
  whole numbers in range, `CRYPTO_KEY_STORAGE_KEY` must be 64 hex
  characters (set the hex SHA-256 of an old passphrase to keep reading
  its files), a JWT must carry a usable `sub`, and only the KMS providers
  in `KMS_PROVIDERS` (default `local`) can be used.
- **OPAQUE registration** needs credentials; a caller registers only its
  own subject unless it holds `crypto:admin`.

## 0.0.2 to 0.0.3

### Error Classification

Some errors that previously returned HTTP 500 now return 400 when the input is
invalid (e.g., malformed hex keys, unsupported algorithm names). Update your
error handling if you rely on status codes.

### New Dependencies

- `@noble/post-quantum` added (PQC algorithms)
- `@noble/ciphers` upgraded to ^2.2.0 (AES-GCM-SIV support)

### New Features

#### Post-Quantum Cryptography

All PQC modules live in `crypto-lib/src/modern/`:

- **ML-KEM** (FIPS 203) — Key encapsulation at 512/768/1024 security levels
- **ML-DSA** (FIPS 204) — Lattice-based digital signatures (44/65/87)
- **SLH-DSA** (FIPS 205) — Hash-based stateless signatures (all parameter sets)
- **FN-DSA** (FIPS 206) — FALCON lattice signatures (512/1024)
- **HPKE** (RFC 9180) — Hybrid Public Key Encryption with X25519/P-256 suites
- **Hybrid KEM** — X25519+ML-KEM-768, P-256+ML-KEM-768, X448+ML-KEM-1024

#### High-Level APIs

Opinionated wrappers in `crypto-lib/src/high-level/`:

- `secretbox` / `secretboxOpen` — symmetric authenticated encryption
  (XChaCha20-Poly1305)
- `sealedbox` / `sealedboxOpen` — anonymous public-key encryption (X25519 +
  XChaCha20-Poly1305)
- `passwordEncrypt` / `passwordDecrypt` — password-based encryption (Argon2id +
  XChaCha20-Poly1305)
- `keyWrap` / `keyUnwrap` — X25519 ECDH + AES-KW/KWP key wrapping
- `multiEncrypt` / `multiDecrypt` — multi-recipient envelope encryption

#### Protocols

Production-grade protocol implementations in `crypto-lib/src/protocols/`:

- **PQXDH** — Post-Quantum Extended Triple Diffie-Hellman key agreement
- **Double Ratchet** — Forward-secret messaging (Signal-like)
- **PAKE** — OPAQUE-like password-authenticated key exchange
- **Threshold** — Shamir Secret Sharing + Feldman Verifiable Secret Sharing

#### Streaming

Streaming cryptography in `crypto-lib/src/streaming/`:

- `stream-aead` — chunked XChaCha20-Poly1305 encryption/decryption
- `stream-hash` — incremental SHA-2/SHA-3/BLAKE hashing
- `web-streams` — Web Streams API (`TransformStream`) wrappers

#### Key Management

Key lifecycle utilities in `crypto-lib/src/keys/`:

- `keygen` — unified key pair generation for all supported algorithms
- `serialize` — hex, base64, and JWK serialization
- `keyring` — in-memory keyring with expiry and rotation

#### Unified Crypto API

`crypto-lib/src/crypto.ts` provides a single-entry-point facade with an
algorithm registry. Call `encrypt("xchacha20-poly1305", ...)` or
`sign("ed25519", ...)` without importing individual modules.

#### Acceleration

- **WebCrypto bridge** — hardware-accelerated AES-GCM and SHA-2
- **Native PQC bridge** — Node.js 24.7+ OpenSSL 3.5 ML-KEM/ML-DSA
- **WASM bridge** — ready for awasm-noble
- **Worker pool** — offload CPU-intensive operations to worker threads

#### Server Improvements

- `Cache-Control: no-store` on all `/v2/` responses
- Error classification: 400 for bad input, 500 for internal failures
- Rate limiting on password hashing endpoints (5 req/minute)
- Request tracing via `x-request-id` header
- Security headers via `@fastify/helmet`

#### Additional Algorithms

- **AES-GCM-SIV** — nonce-misuse-resistant AEAD
- **KMAC** — Keccak-based MAC
- **Schnorr** — BIP-340 signatures (secp256k1)
- **Argon2i/d** variants and PHC string format (`verifyPasswordPhc`)
- **X448** key exchange and Ed448 signatures

#### SDK

`crypto-sdk` now has full method coverage for all v2 endpoints — encryption,
hashing, signing, KDF, PQC KEM, and algorithm listing.

#### CLI

New `modern` subcommands for all v2 operations: encrypt, decrypt, hash, sign,
verify, keygen, kdf, pq-kem, pq-sign.

### Upgrade Steps

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

5. **Review new TypeDoc documentation.** All 18 packages now have 100% JSDoc
   coverage. Run `pnpm docs` in any package to generate HTML docs.
