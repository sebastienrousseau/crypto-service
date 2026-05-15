<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-lib-logo.svg" alt="crypto-lib logo" width="128" />
</p>

<h1 align="center">crypto-lib</h1>

<p align="center">
  A modern cryptographic library for TypeScript, with post-quantum
  support, zero unsafe dependencies, and 100% test coverage.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-lib"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-lib?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT%2FApache--2.0-blue?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

**Getting started**

- [Install](#install) -- npm, pnpm, source
- [Quick Start](#quick-start) -- encrypt and decrypt in ten lines

**Library reference**

- [Overview](#overview) -- what crypto-lib does and why
- [Features](#features) -- module-level capability list
- [Library Usage](#library-usage) -- hash, sign, encrypt, KEM, passwords, keyrings
- [Examples](#examples) -- runnable script index

**Operational**

- [Security](#security) -- guarantees and threat model
- [Documentation](#documentation) -- API reference
- [Contributing](#contributing) -- how to get involved
- [License](#license)

---

## Install

```bash
pnpm add @sebastienrousseau/crypto-lib
# or
npm install @sebastienrousseau/crypto-lib
```

### From source

```bash
git clone https://github.com/sebastienrousseau/crypto-service.git
cd crypto-service
pnpm install
pnpm --filter @sebastienrousseau/crypto-lib build
```

Requires **Node >= 22**.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Quick Start

```ts
import { crypto } from "@sebastienrousseau/crypto-lib";

// Generate a random 256-bit key
const key = crypto.randomKey();

// Encrypt (XChaCha20-Poly1305 via secretbox)
const ciphertext = crypto.encrypt(key, "classified payload");

// Decrypt
const plaintext = crypto.decrypt(key, ciphertext);
console.log(Buffer.from(plaintext).toString("utf8"));
// => "classified payload"

// Hash
const digest = crypto.hash("sha3-256", "hello world");

// Sign and verify (Ed25519)
const kp = crypto.generateKeyPair("ed25519");
const sig = crypto.sign("ed25519", kp.privateKey, "message");
const ok = crypto.verify("ed25519", kp.publicKey, "message", sig);
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Overview

crypto-lib is the core cryptographic engine of the Crypto Service
Suite. It provides a unified TypeScript API over the audited
`@noble/hashes`, `@noble/curves`, `@noble/ciphers`, and
`@noble/post-quantum` libraries -- pure TypeScript, zero native
add-ons, no C bindings. Post-quantum primitives (ML-KEM, ML-DSA,
SLH-DSA) are first-class citizens, not add-ons, and hybrid
constructions combine classical and PQ algorithms so security holds
even if one family breaks.

Two API layers serve different needs: a unified `crypto.*` namespace
for common tasks, and granular per-module imports for full control
and tree-shaking. Both layers use the same underlying noble
primitives; the unified API is a thin dispatcher that adds no
overhead.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Features

| Module                        | Adds                                             |
| :---------------------------- | :----------------------------------------------- |
| `modern/hash`                 | SHA-2, SHA-3, BLAKE2b, BLAKE3                    |
| `modern/aead`                 | XChaCha20-Poly1305 encrypt/decrypt               |
| `modern/aes`                  | AES-GCM, AES-GCM-SIV (128/256)                   |
| `modern/signing`              | Ed25519 key generation, sign, verify             |
| `modern/curves`               | P-256, P-384, Ed448, X448, Schnorr (BIP-340)     |
| `modern/mac`                  | HMAC (SHA-2, SHA-3), KMAC-128/256                |
| `modern/kdf`                  | scrypt, HKDF-SHA256, PBKDF2-SHA256               |
| `modern/password`             | Argon2id/i/d hash, verify, PHC format            |
| `modern/pq-kem`               | ML-KEM-512/768/1024, hybrid KEMs                 |
| `modern/pq-sign`              | ML-DSA-44/65/87, hybrid signatures               |
| `modern/pq-hash-sign`         | SLH-DSA (FIPS 205)                               |
| `high-level/secretbox`        | Symmetric seal/open                              |
| `high-level/sealedbox`        | Anonymous public-key encryption                  |
| `high-level/password-encrypt` | Password-based encryption                        |
| `high-level/key-wrap`         | AES-KW, AES-KWP, X25519-AES-KW                   |
| `high-level/multi-recipient`  | Multi-recipient encryption                       |
| `keys/keygen`                 | Unified key generation (12 algorithms)           |
| `keys/serialize`              | Hex, Base64, PEM, JWK, thumbprints               |
| `keys/keyring`                | In-memory keyring with rotation and JWKS         |
| `streaming/stream-hash`       | Incremental hashing for large inputs             |
| `streaming/stream-aead`       | Streaming AEAD encryption                        |
| `protocols/pqxdh`             | Post-Quantum Extended Triple DH                  |
| `protocols/ratchet`           | Double Ratchet (Signal-style)                    |
| `protocols/pake`              | OPAQUE-like PAKE                                 |
| `protocols/threshold`         | Shamir SSS + Feldman VSS                         |
| `registry`                    | Algorithm metadata, deprecation, recommendations |
| `crypto`                      | Unified API namespace                            |
| `utils`                       | `timingSafeEqual`, `SecureBuffer`                |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Library Usage

<details>
<summary><b>Hashing</b></summary>

```ts
import { hash } from "@sebastienrousseau/crypto-lib";

const r = hash({ algorithm: "sha3-256", data: "hello" });
console.log(r.digest); // hex string
```

</details>

<details>
<summary><b>Signing</b></summary>

```ts
import { crypto } from "@sebastienrousseau/crypto-lib";

const kp = crypto.generateKeyPair("ed25519");
const sig = crypto.sign("ed25519", kp.privateKey, "payload");
const ok = crypto.verify("ed25519", kp.publicKey, "payload", sig);
```

</details>

<details>
<summary><b>Symmetric Encryption</b></summary>

```ts
import { aeadEncrypt, aeadDecrypt } from "@sebastienrousseau/crypto-lib";

const key = "a".repeat(64); // 32-byte hex key
const { ciphertext } = aeadEncrypt({ key, plaintext: "secret" });
const plain = aeadDecrypt({ key, ciphertext });
```

</details>

<details>
<summary><b>Post-Quantum KEM</b></summary>

```ts
import {
  mlKemKeygen,
  mlKemEncapsulate,
  mlKemDecapsulate,
} from "@sebastienrousseau/crypto-lib";

const kp = mlKemKeygen(768);
const { ciphertext, sharedSecret: ss1 } = mlKemEncapsulate(768, kp.publicKey);
const { sharedSecret: ss2 } = mlKemDecapsulate(768, kp.secretKey, ciphertext);
// ss1 === ss2
```

</details>

<details>
<summary><b>Password Hashing</b></summary>

```ts
import { hashPassword, verifyPasswordPhc } from "@sebastienrousseau/crypto-lib";

const result = hashPassword({ password: "hunter2" });
console.log(result.phc); // $argon2id$v=19$m=65536,t=3,p=4$...
const { valid } = verifyPasswordPhc({ password: "hunter2", phc: result.phc });
```

</details>

<details>
<summary><b>Keyring</b></summary>

```ts
import { Keyring } from "@sebastienrousseau/crypto-lib";

const ring = new Keyring();
const key = ring.add("ed25519", { use: "sig" });
const rotated = ring.rotate(key.kid);
const jwks = ring.toJwks();
```

</details>

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/`
directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category       | Example                               | Purpose                                   |
| :------------- | :------------------------------------ | :---------------------------------------- |
| Hashing        | [hash.ts](examples/hash.ts)           | SHA-256, SHA-3, BLAKE3                    |
| Encryption     | [encrypt.ts](examples/encrypt.ts)     | XChaCha20-Poly1305 encrypt/decrypt        |
| Signing        | [sign.ts](examples/sign.ts)           | Ed25519 sign and verify                   |
| Key Generation | [keygen.ts](examples/keygen.ts)       | Generate key pairs for various algorithms |
| Passwords      | [password.ts](examples/password.ts)   | Argon2id hash and verify                  |
| Secretbox      | [secretbox.ts](examples/secretbox.ts) | Symmetric authenticated encryption        |
| Sealed Box     | [sealedbox.ts](examples/sealedbox.ts) | Anonymous public-key encryption           |
| Keyring        | [keyring.ts](examples/keyring.ts)     | Create, rotate, and export keys           |
| Threshold      | [threshold.ts](examples/threshold.ts) | Shamir secret sharing split/combine       |
| PQ KEM         | [pqkem.ts](examples/pqkem.ts)         | ML-KEM-768 key encapsulation              |
| PQ Sign        | [pqsign.ts](examples/pqsign.ts)       | ML-DSA-65 sign and verify                 |
| HMAC           | [hmac.ts](examples/hmac.ts)           | HMAC-SHA256 compute and verify            |
| KDF            | [kdf.ts](examples/kdf.ts)             | Key derivation with scrypt and HKDF       |
| Streaming      | [stream.ts](examples/stream.ts)       | Incremental hashing with createHasher     |
| Curves         | [curves.ts](examples/curves.ts)       | P-256, P-384, Ed448, Schnorr              |
| Serialization  | [serialize.ts](examples/serialize.ts) | PEM encode/decode, JWK conversion         |
| Hybrid KEM     | [hybrid.ts](examples/hybrid.ts)       | Hybrid post-quantum key exchange          |
| Registry       | [registry.ts](examples/registry.ts)   | Query algorithm registry                  |
| Unified API    | [unified.ts](examples/unified.ts)     | Unified crypto API overview               |
| Ratchet        | [ratchet.ts](examples/ratchet.ts)     | Double Ratchet protocol demo              |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

**No native dependencies.** The entire cryptographic stack is pure
TypeScript via the `@noble/*` family. There is no C, Rust, or WASM
code to audit separately, and no platform-specific build step.

**Timing-safe comparisons.** All verification functions (HMAC,
password, signature) use constant-time comparison to prevent timing
side-channel attacks.

**Zero unsafe code.** No `eval`, no dynamic `require`, no `Function`
constructor (except for the optional worker pool, which uses an
inline script). No ambient network access.

**Secure defaults.** Nonces are always generated randomly. Argon2id
uses OWASP-recommended parameters (t=3, m=64 MB, p=4). Key lengths
default to 256 bits.

**Post-quantum preparedness.** ML-KEM and ML-DSA are available
standalone and in hybrid mode. Hybrid constructions combine
classical and post-quantum shared secrets via HKDF so that breaking
one family does not compromise the session.

**Responsible disclosure.** Report vulnerabilities via
[GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Documentation

API reference documentation is generated with TypeDoc. Build it
locally with:

```bash
pnpm --filter @sebastienrousseau/crypto-lib docs
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup,
coding standards, and pull request guidelines.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)
or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service
Suite contributors.

<p align="right"><a href="#contents">Back to Top</a></p>
