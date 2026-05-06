# @sebastienrousseau/crypto-testing

Deterministic keys, fast mocks, and test fixtures for crypto-lib -- make your CI/CD pipeline fast and reproducible.

## Install

```bash
pnpm add -D @sebastienrousseau/crypto-testing
```

Or with the workspace protocol in a monorepo:

```jsonc
{
  "devDependencies": {
    "@sebastienrousseau/crypto-testing": "workspace:*",
  },
}
```

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

## Examples

See the `examples/` directory for complete, runnable examples:

- **[keys.ts](./examples/keys.ts)** -- Using deterministic test keys
- **[mocks.ts](./examples/mocks.ts)** -- Mocking crypto operations for speed
- **[fixtures.ts](./examples/fixtures.ts)** -- Using pre-built test fixtures
- **[assertions.ts](./examples/assertions.ts)** -- Assertion helpers in tests

## License

MIT OR Apache-2.0 -- Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
