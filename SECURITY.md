# Security Policy

## Supported Versions

| Version | Supported           |
| ------- | ------------------- |
| 0.0.3   | Yes                 |
| 0.0.2   | Security fixes only |
| < 0.0.2 | No                  |

## Reporting a Vulnerability

We take the security of Crypto Service Suite seriously. If you discover a
security vulnerability, please report it responsibly.

**Email:** [security@crypto-service.co](mailto:security@crypto-service.co)

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
  secrets, or passwords through logs, error messages, or timing side channels.
- **Cryptographic misuse:** Weak defaults, algorithm downgrade attacks, or
  nonce reuse in the library or server APIs.
- **Authentication bypass:** Circumventing API key validation or JWT
  authentication on protected endpoints.
- **Input validation flaws:** Malformed inputs causing crashes, memory
  exhaustion, or undefined behavior in cryptographic operations.
- **Dependency vulnerabilities:** Known CVEs in direct dependencies
  (@noble/\*, openpgp, Fastify, argon2).

### Out of Scope

- Denial-of-service via legitimate high-volume requests (mitigated by
  rate limiting).
- Social engineering or phishing.
- Vulnerabilities in the underlying operating system or Node.js runtime
  (report those upstream).

## Supported Algorithms

### Modern (v2 API)

- **Symmetric encryption:** XChaCha20-Poly1305, AES-256-GCM-SIV
- **Hashing:** SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-512, BLAKE2b, BLAKE3
- **Key derivation:** Argon2id/i/d, scrypt, HKDF-SHA256, PBKDF2-SHA256
- **Signatures:** Ed25519, Ed448, ECDSA-P256, ECDSA-P384, Schnorr (BIP-340)
- **Key exchange:** X25519, X448
- **MAC:** HMAC-SHA256/384/512, HMAC-SHA3-256/512, KMAC
- **Post-quantum:** ML-KEM-512/768/1024 (FIPS 203), ML-DSA-44/65/87 (FIPS 204),
  SLH-DSA (FIPS 205), X25519+ML-KEM-768 hybrid
- **High-level:** Secretbox, Sealed Box, password encryption, key wrapping
  (AES-KW/KWP), multi-recipient encryption

### Deprecated (v1 API)

The v1 routes use OpenPGP (via the openpgp library) for key generation,
encryption, decryption, signing, verification, and revocation. These routes
emit `Deprecation` and `Sunset` headers and will be removed in a future
major release. Migrate to the v2 API for modern, audited primitives.

## Security Controls

- **Rate limiting:** Global rate limit (10 req/window) with stricter limits
  on password hashing endpoints (5 req/minute).
- **Cache-Control:** All v2 responses include `Cache-Control: no-store` and
  `Pragma: no-cache` to prevent caching of sensitive cryptographic material.
- **Input validation:** Fastify JSON Schema validation on all route bodies
  with `additionalProperties: false`.
- **Error classification:** Invalid input errors return 400; internal
  failures return 500. Cryptographic error details are never leaked to
  clients.
- **Helmet:** Security headers (CSP, HSTS, X-Frame-Options, etc.) via
  @fastify/helmet.
- **CORS:** Configurable origin allowlist.
- **Request tracing:** Unique `x-request-id` on every response.
