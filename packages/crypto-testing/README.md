<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-testing-logo.svg" alt="crypto-testing" width="128" />
</p>

<h1 align="center">crypto-testing</h1>

<p align="center">
  Deterministic keys, fast mocks, and test fixtures for crypto-lib -- make your CI/CD pipeline fast and reproducible.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-testing"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-testing?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License MIT" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

- [Install](#install) — get started in seconds
- [Quick Start](#quick-start) — mock, assert, and fixture in ten lines
- [Features](#features) — what the package provides
- [Deterministic Keys](#deterministic-keys) — stable key pairs across every run
- [Mock Functions](#mock-functions) — instant fakes for expensive crypto
- [Fixtures](#fixtures) — complete test data in one call
- [Assertion Helpers](#assertion-helpers) — one-liner validations
- [Examples](#examples) — runnable scripts in `examples/`
- [Security](#security) — important caveats
- [License](#license) — Apache-2.0 OR MIT

---

## Install

**npm / pnpm**

```bash
npm install -D @sebastienrousseau/crypto-testing
# or
pnpm add -D @sebastienrousseau/crypto-testing
```

**Workspace protocol (monorepo)**

```jsonc
{
  "devDependencies": {
    "@sebastienrousseau/crypto-testing": "workspace:*",
  },
}
```

Requires **Node >= 22**.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Quick Start

```ts
import {
  TEST_KEYS,
  TEST_VECTORS,
  mockEncrypt,
  mockDecrypt,
  createTestKeyring,
  expectValidHex,
  expectSignVerifyRoundTrip,
} from "@sebastienrousseau/crypto-testing";

// Use deterministic keys instead of generating new ones every run
const { publicKey, privateKey } = TEST_KEYS.ed25519;

// Mock encrypt/decrypt for fast unit tests
const ct = mockEncrypt(TEST_KEYS.aes256, "secret data");
const pt = mockDecrypt(TEST_KEYS.aes256, ct);

// Validate outputs
expectValidHex(publicKey, 32);

// Full sign/verify round-trip with real crypto-lib
expectSignVerifyRoundTrip("ed25519");
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Features

| Category       | What you get                                                                  |
| -------------- | ----------------------------------------------------------------------------- |
| **Keys**       | Pre-generated Ed25519, X25519, P-256, AES-256, and HMAC key pairs/keys        |
| **Vectors**    | Known plaintext with expected SHA-256, SHA3-256, and BLAKE3 digests           |
| **Mocks**      | Instant XOR-based fakes for encrypt, decrypt, sign, verify, password hashing  |
| **Fixtures**   | One-call generators for keyrings, encrypted messages, signed messages, hashes |
| **Assertions** | Hex, Base64, key-pair, encrypt/decrypt, and sign/verify round-trip helpers    |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Deterministic Keys

`TEST_KEYS` provides well-known key pairs that never change between runs:

| Key       | Algorithm | Description                      |
| --------- | --------- | -------------------------------- |
| `ed25519` | Ed25519   | 32-byte signing key pair         |
| `x25519`  | X25519    | 32-byte key-exchange pair        |
| `p256`    | P-256     | ECDSA signing key pair           |
| `aes256`  | AES-256   | 32-byte symmetric encryption key |
| `hmacKey` | HMAC      | 32-byte HMAC key                 |

`TEST_VECTORS` includes a known plaintext and its expected hashes (SHA-256, SHA3-256, BLAKE3).

```ts
import { TEST_KEYS, TEST_VECTORS } from "@sebastienrousseau/crypto-testing";

// Stable across every test run
expect(TEST_KEYS.ed25519.publicKey).to.equal(
  "d75a980182b10ab7d54bfed3c964073a0ee172f3daa3f4a18446b7e8c38f1dd5",
);
expect(TEST_VECTORS.sha256).to.equal(
  "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
);
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Mock Functions

Replace expensive crypto operations with instant, deterministic fakes:

| Function              | Replaces                 | Speed     |
| --------------------- | ------------------------ | --------- |
| `mockHashPassword`    | Argon2id (100+ ms)       | < 0.01 ms |
| `mockGenerateKeyPair` | Real key generation      | < 0.01 ms |
| `mockEncrypt`         | XChaCha20-Poly1305       | < 0.01 ms |
| `mockDecrypt`         | XChaCha20-Poly1305       | < 0.01 ms |
| `mockSign`            | Ed25519/ECDSA signatures | < 0.01 ms |
| `mockVerify`          | Signature verification   | < 0.01 ms |

All mock functions use XOR internally -- they are **not cryptographically secure** but are deterministic and round-trip correctly.

```ts
import {
  mockEncrypt,
  mockDecrypt,
  TEST_KEYS,
} from "@sebastienrousseau/crypto-testing";

const ct = mockEncrypt(TEST_KEYS.aes256, "hello");
const pt = Buffer.from(mockDecrypt(TEST_KEYS.aes256, ct)).toString("utf8");
// pt === "hello"
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Fixtures

Fixture generators produce complete test data structures in one call:

| Function                       | Returns                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| `createTestKeyring()`          | Keyring with signing, exchange, ECDSA, symmetric, and HMAC keys |
| `createTestEncryptedMessage()` | Key + plaintext + mock ciphertext                               |
| `createTestSignedMessage()`    | Key pair + message + mock signature                             |
| `createTestPasswordHash()`     | Hash + salt + params + PHC string                               |

```ts
import {
  createTestKeyring,
  createTestSignedMessage,
} from "@sebastienrousseau/crypto-testing";

const keyring = createTestKeyring();
const signed = createTestSignedMessage("ed25519", "my message");
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Assertion Helpers

One-liner assertions that throw descriptive errors on failure:

| Helper                          | Checks                                 |
| ------------------------------- | -------------------------------------- |
| `expectValidHex(value, len?)`   | Valid hex string, optional byte length |
| `expectValidBase64(value)`      | Valid Base64 string with round-trip    |
| `expectKeyPair(kp)`             | Non-empty hex keys, pub != priv        |
| `expectEncryptDecryptRoundTrip` | Real secretbox encrypt then decrypt    |
| `expectSignVerifyRoundTrip`     | Real keygen, sign, and verify          |

```ts
import {
  expectValidHex,
  expectKeyPair,
  TEST_KEYS,
} from "@sebastienrousseau/crypto-testing";

expectValidHex("deadbeef");
expectValidHex(TEST_KEYS.aes256, 32);
expectKeyPair(TEST_KEYS.ed25519);
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/` directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category   | Example                                 | Purpose                                   |
| ---------- | --------------------------------------- | ----------------------------------------- |
| Keys       | [keys.ts](examples/keys.ts)             | Using deterministic test keys             |
| Mocks      | [mocks.ts](examples/mocks.ts)           | Mocking crypto operations for speed       |
| Fixtures   | [fixtures.ts](examples/fixtures.ts)     | Using pre-built test fixtures             |
| Assertions | [assertions.ts](examples/assertions.ts) | Assertion helpers in tests                |
| Helpers    | [support.ts](examples/support.ts)       | Shared display helpers for example output |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

**Not for production.** This package is a test utility. The mock functions use XOR -- they provide **zero** cryptographic security. Never use `mockEncrypt`, `mockSign`, or `mockHashPassword` outside of tests.

**Deterministic keys are public.** `TEST_KEYS` values are well-known constants. Do not use them to protect real data.

**Real crypto in assertion helpers.** `expectEncryptDecryptRoundTrip` and `expectSignVerifyRoundTrip` call through to `@sebastienrousseau/crypto-lib` and exercise real cryptographic operations.

**Responsible disclosure.** Report vulnerabilities via [GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service Suite contributors.

<p align="right"><a href="#contents">Back to Top</a></p>
