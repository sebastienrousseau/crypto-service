# Crypto Service Suite — 2026 Roadmap & Implementation Plan

## 1. Market & Landscape Analysis (April 2026)

### 1.1 The Post-Quantum Inflection Point

2026 is the year PQC went from "prepare" to "deploy":

- **NIST FIPS 203/204/205** (Aug 2024) are now enforceable federal standards.
  ML-KEM, ML-DSA, and SLH-DSA are the three pillars.
- **Chrome 131+** ships X25519MLKEM768 as the default TLS 1.3 key exchange.
  57.4% of browser connections now include a PQ key share (Apr 2026).
- **Node.js v24.7.0** (Aug 2025) added native PQC support in its crypto module
  and upgraded WebCrypto with next-gen algorithms including AES-OCB.
- **Signal** deployed PQXDH (ML-KEM + X25519) for all initial key exchanges and
  the Sparse Post-Quantum Ratchet (SPQR / "Triple Ratchet") for ongoing messages.
- **AWS, Azure, GCP** all support PQC-enabled TLS endpoints in production.
- **Akamai** made hybrid PQ key exchange the default for all connections (Jan 2026).
- **IETF draft-ietf-tls-ecdhe-mlkem** standardizes hybrid ECDHE-MLKEM for TLS 1.3.

### 1.2 Competitor Landscape

| Library                   | Language     | PQC                             | Audit                 | Stars | Strengths                                           | Weaknesses                                                                        |
| ------------------------- | ------------ | ------------------------------- | --------------------- | ----- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| **@noble/\***             | JS/TS        | ML-KEM, ML-DSA, SLH-DSA, Falcon | Yes (v2.2.0 Apr 2026) | 5k+   | Audited, zero-dep, pure JS, fastest                 | Low-level primitives only — no high-level API, no key serialization, no protocols |
| **libsodium.js**          | JS (WASM)    | No                              | Inherited from C      | 1k+   | Battle-tested NaCl API, WASM perf                   | No PQC, dated API, large WASM bundle                                              |
| **Web Crypto API**        | Browser+Node | No (Node 24.7 partial)          | Platform              | N/A   | Hardware-accelerated, 2-15x faster                  | Limited algorithm set, no PQC in browsers                                         |
| **node:crypto**           | Node.js      | Node 24.7+ partial              | Platform              | N/A   | Native performance, OpenSSL backend                 | Node-only, complex API                                                            |
| **crypto-service (this)** | TS           | ML-KEM-768 only                 | No                    | —     | Full stack (lib+CLI+API+SDK+server), OpenPGP legacy | Incomplete PQC, no ML-DSA/SLH-DSA, no Argon2                                      |

**Key insight:** No JavaScript library offers a complete, high-level, production-ready
PQC suite with key serialization, hybrid protocols, and REST/SDK access. This is the gap.

### 1.3 What "De Facto" Requires

To be the go-to crypto library in 2026, we need:

1. **Complete NIST PQC coverage** — all FIPS 203/204/205 parameter sets
2. **Hybrid-by-default** — classical + PQ combined for defense in depth
3. **High-level API** — secretbox/sealedbox/PAKE abstractions, not just primitives
4. **Key management** — JWK, PEM, PKCS#8 serialization; key rotation; key wrapping
5. **Password hashing** — Argon2id (the standard), not just scrypt
6. **Streaming** — handle multi-GB files without loading into memory
7. **Protocol building blocks** — PQXDH, Double Ratchet foundations
8. **Performance** — WebCrypto acceleration where available, fallback to @noble
9. **Cross-platform** — Browser, Node.js, Deno, Bun, Edge Workers
10. **Compliance** — FIPS algorithm identifiers, deprecation warnings, audit trail

---

## 2. Current State — What We Have

### crypto-lib (core)

| Category      | What's Implemented                             | What's Missing                                           |
| ------------- | ---------------------------------------------- | -------------------------------------------------------- |
| AEAD          | XChaCha20-Poly1305                             | AES-256-GCM, AES-GCM-SIV, ChaCha20-Poly1305              |
| Hash          | SHA-256/384/512, SHA3-256/512, BLAKE2b, BLAKE3 | BLAKE2s, SHA-512/256, Streaming                          |
| KDF           | scrypt, HKDF-SHA256, PBKDF2-SHA256             | **Argon2id**, HKDF-SHA384/512                            |
| Signing       | Ed25519                                        | **ML-DSA-44/65/87**, **SLH-DSA**, Ed448, ECDSA P-256/384 |
| Key Exchange  | X25519                                         | X448, ECDH P-256/384/521                                 |
| PQ KEM        | ML-KEM-768, X25519+ML-KEM-768 hybrid           | **ML-KEM-512**, **ML-KEM-1024**, hybrid variants         |
| PQ Signatures | None                                           | **ML-DSA**, **SLH-DSA**, Falcon                          |
| Key Formats   | None (raw hex)                                 | JWK, PEM, PKCS#8, SubjectPublicKeyInfo                   |
| Password      | scrypt only                                    | **Argon2id**, bcrypt                                     |
| Protocols     | None                                           | Secretbox, Sealed box, PAKE, key wrapping                |
| Streaming     | None                                           | Stream encrypt/decrypt/hash                              |

### Other Packages

- **crypto-server**: Fastify REST API for v1 (OpenPGP) and v2 (modern) ops
- **crypto-cli**: Interactive CLI for OpenPGP operations
- **crypto-sdk**: Zero-dep fetch-based client for the REST API
- **crypto-api**: Postman-to-markdown converter (utility)

---

## 3. Implementation Plan

### Phase 1: PQC Complete (v0.1.0) — Priority: CRITICAL

**Goal:** Full NIST FIPS 203/204/205 coverage. This is the #1 differentiator.

#### 1A. ML-KEM All Parameter Sets

```
File: src/modern/pq-kem.ts (refactor from pq.ts)
```

- [ ] ML-KEM-512 (keygen, encapsulate, decapsulate) — NIST Level 1
- [ ] ML-KEM-768 (already implemented — migrate)
- [ ] ML-KEM-1024 (keygen, encapsulate, decapsulate) — NIST Level 5
- [ ] Configurable security level via `mlKem({ level: 512 | 768 | 1024 })`
- [ ] Hybrid X25519 + ML-KEM-512 / ML-KEM-1024 variants
- [ ] Hybrid P-256 + ML-KEM-768 (for TLS interop)
- [ ] Input validation: reject malformed public/secret keys with clear errors

**Dependency:** `@noble/post-quantum` ^0.6.x (already installed, has all variants)

#### 1B. ML-DSA (FIPS 204) — Post-Quantum Signatures

```
File: src/modern/pq-sign.ts (NEW)
```

- [ ] ML-DSA-44 (keygen, sign, verify) — NIST Level 2
- [ ] ML-DSA-65 (keygen, sign, verify) — NIST Level 3
- [ ] ML-DSA-87 (keygen, sign, verify) — NIST Level 5
- [ ] Hybrid Ed25519 + ML-DSA-65 (dual-sign, dual-verify)
- [ ] Hybrid Ed25519 + ML-DSA-87
- [ ] Deterministic signing (ML-DSA is deterministic by design)
- [ ] Context strings support (FIPS 204 Section 5.2)

**Dependency:** `@noble/post-quantum/ml-dsa` (available in ^0.6.x)

#### 1C. SLH-DSA (FIPS 205) — Hash-Based Signatures

```
File: src/modern/pq-hash-sign.ts (NEW)
```

- [ ] SLH-DSA-SHA2-128f / SLH-DSA-SHAKE-128f (fast, Level 1)
- [ ] SLH-DSA-SHA2-128s / SLH-DSA-SHAKE-128s (small, Level 1)
- [ ] SLH-DSA-SHA2-192f / SLH-DSA-SHAKE-192f (fast, Level 3)
- [ ] SLH-DSA-SHA2-256f / SLH-DSA-SHAKE-256f (fast, Level 5)
- [ ] SLH-DSA-SHA2-256s / SLH-DSA-SHAKE-256s (small, Level 5)
- [ ] All 12 parameter sets
- [ ] Conservative default: SLH-DSA-SHAKE-256s for maximum security

**Dependency:** `@noble/post-quantum/slh-dsa` (available in ^0.6.x)

**Note on SLH-DSA performance:** SLH-DSA signing is slow (~seconds for 256s).
Document clearly that ML-DSA is preferred for interactive use; SLH-DSA is for
scenarios requiring hash-based security guarantees (e.g., firmware signing,
long-lived certificates).

#### 1D. Server & SDK — PQC Routes

- [ ] `POST /v2/pq/sign` — ML-DSA sign
- [ ] `POST /v2/pq/verify` — ML-DSA verify
- [ ] `POST /v2/pq/hash-sign` — SLH-DSA sign
- [ ] `POST /v2/pq/hash-verify` — SLH-DSA verify
- [ ] `GET /v2/algorithms` — update to include all PQC variants
- [ ] SDK: `pqSign()`, `pqVerify()`, `pqHashSign()`, `pqHashVerify()`

---

### Phase 2: Core Hardening (v0.2.0) — Priority: HIGH

#### 2A. Argon2id Password Hashing

```
File: src/modern/password.ts (NEW)
```

- [ ] Argon2id (recommended for password hashing)
- [ ] Argon2i (side-channel resistant variant)
- [ ] Argon2d (data-dependent, max GPU resistance)
- [ ] Configurable: time cost, memory cost (KiB), parallelism
- [ ] Sensible defaults: t=3, m=65536 (64MB), p=4 (OWASP 2026 recommendation)
- [ ] PHC string format output (`$argon2id$v=19$m=65536,t=3,p=4$salt$hash`)
- [ ] `verify(hash, password)` — constant-time comparison
- [ ] bcrypt compatibility wrapper (for migration from legacy systems)

**Dependency:** `@noble/hashes` has Argon2 in ^1.7.x OR use `hash-wasm` for WASM perf.
If @noble/hashes doesn't include Argon2, use `argon2-browser` (WASM, cross-platform).

#### 2B. AES-GCM / AES-GCM-SIV

```
File: src/modern/aes.ts (NEW)
```

- [ ] AES-256-GCM (encrypt, decrypt) — industry standard AEAD
- [ ] AES-128-GCM (encrypt, decrypt)
- [ ] AES-256-GCM-SIV (nonce-misuse resistant)
- [ ] WebCrypto acceleration: use `crypto.subtle.encrypt('AES-GCM', ...)` when available,
      fall back to `@noble/ciphers/aes` in non-WebCrypto environments
- [ ] 12-byte random nonce (GCM standard) or 96-bit counter mode
- [ ] AAD (additional authenticated data) support
- [ ] Max plaintext size enforcement (2^36 - 32 bytes for GCM)

#### 2C. HMAC

```
File: src/modern/mac.ts (NEW)
```

- [ ] HMAC-SHA256, HMAC-SHA384, HMAC-SHA512
- [ ] HMAC-SHA3-256, HMAC-SHA3-512
- [ ] KMAC-128, KMAC-256 (Keccak-based MAC)
- [ ] Constant-time verification (`timingSafeEqual`)
- [ ] Streaming HMAC for large inputs

#### 2D. Additional Key Exchange

```
Extend: src/modern/ecdh.ts
```

- [ ] X448 (Curve448, 224-bit security)
- [ ] ECDH P-256 (WebCrypto-accelerated when available)
- [ ] ECDH P-384
- [ ] Hybrid X448 + ML-KEM-1024 (maximum security hybrid)

#### 2E. Additional Signatures

```
Extend: src/modern/signing.ts
```

- [ ] Ed448 (448-bit EdDSA)
- [ ] ECDSA P-256 (WebCrypto-accelerated)
- [ ] ECDSA P-384
- [ ] Schnorr signatures (BIP-340, for blockchain interop)

---

### Phase 3: High-Level API (v0.3.0) — Priority: HIGH

This is what separates a "primitive collection" from a "usable library."

#### 3A. Secretbox — Symmetric Authenticated Encryption

```
File: src/high-level/secretbox.ts (NEW)
```

```typescript
// Simple API — just key + plaintext
const encrypted = secretbox.seal(key, plaintext);
const decrypted = secretbox.open(key, encrypted);

// Internals: XChaCha20-Poly1305, random nonce prepended
// Format: nonce (24B) || ciphertext || tag (16B)
```

- [ ] `seal(key, plaintext, aad?)` → `Uint8Array`
- [ ] `open(key, ciphertext, aad?)` → `Uint8Array`
- [ ] Key must be 32 bytes; reject others
- [ ] Nonce generated internally (never exposed to user = no misuse)

#### 3B. Sealed Box — Anonymous Public-Key Encryption

```
File: src/high-level/sealedbox.ts (NEW)
```

```typescript
// Encrypt to a recipient's public key (sender is anonymous)
const sealed = sealedbox.seal(recipientPublicKey, plaintext);
const opened = sealedbox.open(recipientSecretKey, sealed);

// Internals: ephemeral X25519 + XChaCha20-Poly1305
```

- [ ] Classical: X25519 ephemeral + secretbox
- [ ] Post-quantum: X25519 + ML-KEM-768 ephemeral + secretbox
- [ ] `sealPQ(recipientX25519Pub, recipientMlKemPub, plaintext)` → sealed
- [ ] `openPQ(recipientX25519Sec, recipientMlKemSec, sealed)` → plaintext

#### 3C. Password-Based Encryption

```
File: src/high-level/password-encrypt.ts (NEW)
```

```typescript
// Encrypt with a password (Argon2id + XChaCha20-Poly1305)
const encrypted = await passwordEncrypt(password, plaintext);
const decrypted = await passwordDecrypt(password, encrypted);

// Format: version (1B) || argon2 params (16B) || salt (16B) || nonce (24B) || ciphertext || tag
```

- [ ] Argon2id key derivation from password
- [ ] Self-describing format (params embedded in ciphertext)
- [ ] Version byte for future algorithm agility

#### 3D. Key Wrapping (RFC 3394 / RFC 5649)

```
File: src/high-level/key-wrap.ts (NEW)
```

- [ ] AES-KW (Key Wrap) — wraps keys with AES
- [ ] AES-KWP (Key Wrap with Padding) — arbitrary-length data
- [ ] X25519 + AES-KW (public-key key wrapping)

#### 3E. Multi-Recipient Encryption

```
File: src/high-level/multi-recipient.ts (NEW)
```

- [ ] Encrypt once, wrap the symmetric key for each recipient
- [ ] Support mixed classical + PQ recipients
- [ ] Efficient: O(1) encryption + O(n) key wraps

---

### Phase 4: Key Management & Serialization (v0.4.0) — Priority: HIGH

#### 4A. Key Serialization Formats

```
File: src/keys/serialize.ts (NEW)
```

- [ ] PEM encoding/decoding (-----BEGIN ... / -----END ...)
- [ ] PKCS#8 (private keys)
- [ ] SubjectPublicKeyInfo / SPKI (public keys)
- [ ] JWK (JSON Web Key, RFC 7517) — import/export
- [ ] JWK Thumbprint (RFC 7638) — key fingerprinting
- [ ] Raw key export (hex, base64, base64url, Uint8Array)

#### 4B. Key Generation with Metadata

```
File: src/keys/keygen.ts (NEW)
```

```typescript
const keypair = await generateKeyPair({
  algorithm: "ed25519", // or 'ml-dsa-65', 'x25519', etc.
  format: "jwk", // 'pem', 'raw', 'pkcs8'
  metadata: {
    kid: "my-key-2026", // Key ID
    use: "sig", // 'sig' or 'enc'
    exp: "2027-01-01", // Expiration
  },
});
```

- [ ] Unified key generation across all algorithms
- [ ] Key ID generation (SHA-256 thumbprint)
- [ ] Expiration metadata
- [ ] Algorithm-specific validation

#### 4C. Keyring / Key Store

```
File: src/keys/keyring.ts (NEW)
```

- [ ] In-memory keyring (Map-based, for SDK/server use)
- [ ] Key rotation: `keyring.rotate('my-key')` generates new key, archives old
- [ ] Key lookup by ID, algorithm, or purpose
- [ ] Encrypted-at-rest keyring serialization (password-protected)
- [ ] JWK Set (JWKS) export for RFC 7517 compliance

---

### Phase 5: Streaming & Performance (v0.5.0) — Priority: MEDIUM

#### 5A. Streaming Encryption/Decryption

```
File: src/streaming/stream-aead.ts (NEW)
```

- [ ] `createEncryptStream(key, aad?)` → `TransformStream`
- [ ] `createDecryptStream(key, aad?)` → `TransformStream`
- [ ] Chunk-based AEAD (STREAM construction from libsodium)
- [ ] Each chunk independently authenticated (no need to buffer entire file)
- [ ] Final chunk marker to prevent truncation attacks
- [ ] Compatible with Node.js `pipeline()` and Web Streams

#### 5B. Streaming Hash

```
File: src/streaming/stream-hash.ts (NEW)
```

- [ ] `createHashStream(algorithm)` → `TransformStream` that outputs digest
- [ ] Support all hash algorithms
- [ ] Incremental hash update (no memory accumulation)

#### 5C. WebCrypto Acceleration Layer

```
File: src/accel/webcrypto-bridge.ts (NEW)
```

- [ ] Feature-detect `crypto.subtle` availability
- [ ] Auto-accelerate AES-GCM, SHA-256/384/512, ECDSA P-256/384, ECDH P-256/384
- [ ] Transparent fallback to @noble when WebCrypto unavailable
- [ ] Benchmark: 2-15x faster for AES-GCM on platforms with AES-NI

#### 5D. Worker Thread Offloading

```
File: src/accel/worker-pool.ts (NEW)
```

- [ ] Optional worker pool for CPU-intensive operations (Argon2, scrypt, ML-KEM keygen)
- [ ] Auto-detect: use `Worker` in browsers, `worker_threads` in Node.js
- [ ] Configurable pool size (default: `navigator.hardwareConcurrency`)

---

### Phase 6: Protocol Building Blocks (v0.6.0) — Priority: MEDIUM

#### 6A. PQXDH — Post-Quantum Extended Triple Diffie-Hellman

```
File: src/protocols/pqxdh.ts (NEW)
```

- [ ] Implement Signal's PQXDH key agreement protocol
- [ ] X25519 + ML-KEM-768 combined key agreement
- [ ] Identity keys, signed pre-keys, one-time pre-keys
- [ ] Shared secret derivation via HKDF
- [ ] Foundation for end-to-end encrypted messaging

#### 6B. Double Ratchet with PQ Upgrades

```
File: src/protocols/ratchet.ts (NEW)
```

- [ ] Symmetric ratchet (KDF chain)
- [ ] Diffie-Hellman ratchet (X25519-based)
- [ ] Header encryption
- [ ] Out-of-order message handling
- [ ] PQ ratchet step (periodic ML-KEM re-encapsulation)

#### 6C. SRP / OPAQUE — Password-Authenticated Key Exchange

```
File: src/protocols/pake.ts (NEW)
```

- [ ] OPAQUE (asymmetric PAKE, draft-irtf-cfrg-opaque)
- [ ] SRP-6a (legacy but widely deployed)
- [ ] Zero-knowledge password proof (server never sees password)

#### 6D. Threshold Signatures (Shamir Secret Sharing)

```
File: src/protocols/threshold.ts (NEW)
```

- [ ] Shamir's Secret Sharing (split key into n shares, threshold t)
- [ ] Share verification (Feldman VSS)
- [ ] Key reconstruction from threshold shares
- [ ] Applications: multi-party key management, backup recovery

---

### Phase 7: Ecosystem & DX (v0.7.0) — Priority: MEDIUM

#### 7A. Algorithm Registry & Deprecation

```
File: src/registry.ts (NEW)
```

- [ ] Central algorithm registry with metadata (security level, performance, status)
- [ ] `deprecated` flag for weak algorithms (RSA-1024, MD5, SHA-1, etc.)
- [ ] Console warnings when using deprecated algorithms
- [ ] `recommended()` function returns current best-practice algorithms
- [ ] Algorithm aliases (e.g., `'aes-256-gcm'` → `'aes256gcm'`)

#### 7B. Unified API Surface

```typescript
import { crypto } from "@sebastienrousseau/crypto-lib";

// Everything through one namespace
const key = crypto.generateKey("xchacha20-poly1305");
const ct = crypto.encrypt(key, plaintext);
const pt = crypto.decrypt(key, ct);
const sig = crypto.sign("ed25519", privateKey, message);
const ok = crypto.verify("ed25519", publicKey, message, sig);
const h = crypto.hash("sha3-256", data);
const kp = crypto.generateKeyPair("ml-dsa-65");
const pwd = await crypto.hashPassword(password); // Argon2id
```

#### 7C. CLI v2 — Modern Crypto Commands

- [ ] `cryptocli encrypt --algorithm xchacha20-poly1305 --key-file key.bin < input > output`
- [ ] `cryptocli keygen --algorithm ml-dsa-65 --format pem --output keys/`
- [ ] `cryptocli sign --algorithm ed25519+ml-dsa-65 --key-file priv.pem < message`
- [ ] `cryptocli hash --algorithm sha3-256 < input`
- [ ] `cryptocli password-hash --algorithm argon2id`
- [ ] Non-interactive mode (no prompts, pipe-friendly)
- [ ] JSON output mode (`--json`)

#### 7D. Documentation & Examples

- [ ] Algorithm selection guide ("which algorithm should I use?")
- [ ] Migration guide: OpenPGP/RSA → modern/PQ
- [ ] PQC readiness checklist
- [ ] Performance benchmarks (all algorithms, all platforms)
- [ ] Interoperability test vectors (NIST KAT vectors)
- [ ] Security model documentation

---

### Phase 8: Compliance & Hardening (v1.0.0) — Priority: HIGH for release

#### 8A. Security Audit

- [ ] Commission third-party audit (Trail of Bits, NCC Group, or Cure53)
- [ ] Focus areas: timing attacks, memory safety, key handling
- [ ] Publish audit report publicly

#### 8B. FIPS Compliance Documentation

- [ ] Map every algorithm to its FIPS standard
- [ ] Document which operations use FIPS-approved algorithms
- [ ] CAVP test vector validation for each algorithm

#### 8C. Constant-Time Guarantees

- [ ] Expose `timingSafeEqual()` utility
- [ ] Audit all comparison operations for constant-time behavior
- [ ] Document which operations are / aren't constant-time

#### 8D. Memory Safety

- [ ] Zero sensitive key material after use (`sodium_memzero` equivalent)
- [ ] `SecureBuffer` class that auto-zeros on GC / explicit `.destroy()`
- [ ] Warn if keys are logged or serialized to strings unnecessarily

---

## 4. Dependency Strategy

### Core Dependencies (audited, zero-dep)

| Package               | Version | Provides                                                       |
| --------------------- | ------- | -------------------------------------------------------------- |
| `@noble/ciphers`      | ^1.2.x  | XChaCha20, AES-GCM, AES-GCM-SIV, ChaCha20                      |
| `@noble/curves`       | ^1.8.x  | Ed25519, Ed448, X25519, X448, P-256, P-384, Schnorr            |
| `@noble/hashes`       | ^1.7.x  | SHA-2, SHA-3, BLAKE2/3, HKDF, PBKDF2, scrypt, HMAC             |
| `@noble/post-quantum` | ^0.6.x  | ML-KEM-512/768/1024, ML-DSA-44/65/87, SLH-DSA (all 12), Falcon |

### Optional Dependencies

| Package                         | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| `argon2-browser` or `hash-wasm` | Argon2id WASM implementation (cross-platform) |

### Removed Dependencies (Phase 1+)

| Package   | Reason                                                 |
| --------- | ------------------------------------------------------ |
| `openpgp` | Legacy; v1 routes deprecated in favor of v2 modern API |

---

## 5. Migration & Versioning Strategy

### Semantic Versioning

- **0.x.y**: Pre-1.0 development. API may change between minor versions.
- **1.0.0**: First stable release after audit. API frozen for major version.

### Deprecation Path

1. **v0.1.0**: Mark v1 (OpenPGP) routes as `@deprecated` in JSDoc
2. **v0.3.0**: Add console warnings for v1 route usage
3. **v1.0.0**: Remove v1 OpenPGP routes entirely. Modern API only.

### Import Structure

```typescript
// Primitives (tree-shakeable)
import { aeadEncrypt } from "@sebastienrousseau/crypto-lib/aead";
import { mlDsaSign } from "@sebastienrousseau/crypto-lib/pq-sign";
import { argon2id } from "@sebastienrousseau/crypto-lib/password";

// High-level (recommended for most users)
import { secretbox, sealedbox, crypto } from "@sebastienrousseau/crypto-lib";

// Full namespace
import CryptoLib from "@sebastienrousseau/crypto-lib";
```

---

## 6. Priority & Timeline

| Phase | Name             | Priority | Estimated Effort | Target |
| ----- | ---------------- | -------- | ---------------- | ------ |
| 1     | PQC Complete     | CRITICAL | 2-3 weeks        | v0.1.0 |
| 2     | Core Hardening   | HIGH     | 2-3 weeks        | v0.2.0 |
| 3     | High-Level API   | HIGH     | 2 weeks          | v0.3.0 |
| 4     | Key Management   | HIGH     | 2 weeks          | v0.4.0 |
| 5     | Streaming & Perf | MEDIUM   | 2 weeks          | v0.5.0 |
| 6     | Protocol Blocks  | MEDIUM   | 3 weeks          | v0.6.0 |
| 7     | Ecosystem & DX   | MEDIUM   | 2 weeks          | v0.7.0 |
| 8     | Audit & Release  | HIGH     | 4-6 weeks        | v1.0.0 |

---

## 7. Success Metrics

- [ ] 100% NIST FIPS 203/204/205 parameter set coverage
- [ ] 100% code coverage maintained across all packages
- [ ] All NIST KAT (Known Answer Test) vectors passing
- [ ] Performance within 2x of native implementations for all algorithms
- [ ] Zero CVEs in published versions
- [ ] Third-party security audit completed and published
- [ ] npm weekly downloads > 10,000
- [ ] Adopted by at least 3 production applications

---

## Sources

- [NIST FIPS 203 — ML-KEM Standard](https://csrc.nist.gov/pubs/fips/203/final)
- [NIST FIPS 204 — ML-DSA Standard](https://csrc.nist.gov/pubs/fips/204/final)
- [NIST FIPS 205 — SLH-DSA Standard](https://csrc.nist.gov/pubs/fips/205/final)
- [NIST Releases First 3 Finalized PQC Standards](https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards)
- [Noble Post-Quantum — npm](https://www.npmjs.com/package/@noble/post-quantum)
- [Noble Cryptography Suite](https://paulmillr.com/noble/)
- [Node.js v24.7.0 — PQC & WebCrypto](https://dev.to/zaheetdev/nodejs-v2470-released-post-quantum-cryptography-modern-webcrypto-and-more-1df9)
- [Chrome ML-KEM Default (Chrome 131)](https://pbxscience.com/chromes-quantum-lock-how-ml-kem-changed-the-web/)
- [IETF Hybrid ECDHE-MLKEM for TLS 1.3](https://datatracker.ietf.org/doc/draft-ietf-tls-ecdhe-mlkem/)
- [Signal PQXDH Protocol](https://signal.org/docs/specifications/pqxdh/)
- [Signal SPQR — Post-Quantum Ratchet](https://signal.org/blog/spqr/)
- [PQC Enterprise Migration Guide 2026](https://securityboulevard.com/2026/03/post-quantum-cryptography-for-authentication-the-enterprise-migration-guide-2026/)
- [Cloudflare Post-Quantum IPsec](https://www.infoq.com/news/2026/03/cloudflare-post-quantum-ipsec/)
- [NIST SP 800-208 — Stateful HBS (XMSS/LMS)](https://csrc.nist.gov/pubs/sp/800/208/final)
- [Noble vs Libsodium Comparison](https://www.nikgraf.com/blog/choosing-a-cryptography-library-in-javascript-noble-vs-libsodium-js)
- [Akamai PQ TLS Default](https://www.akamai.com/blog/security/post-quantum-cryptography-implementation-considerations-tls)
- [PQC ITS Blog April 2026](https://www.its.cz/en/aktuality/its-blog-novinky-v-oblasti-post-kvantove-kryptografie-duben-2026/)
