# ⚙️ @sebastienrousseau/crypto-lib

Pure async functions over [openpgp 5](https://openpgpjs.org/) (RFC 4880).
Caller supplies all key material as ASCII-armored strings; the library never
touches the filesystem and never logs passphrases.

[![NPM Version](https://img.shields.io/npm/v/@sebastienrousseau/crypto-lib.svg?style=flat-square)](https://www.npmjs.com/package/@sebastienrousseau/crypto-lib)
[![Coverage](https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service/main.svg?style=flat-square)](https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

> Part of the [Crypto Service Suite](https://github.com/sebastienrousseau/crypto-service).
> See the root [README](../../README.md) and
> [`docs/architecture.md`](../../docs/architecture.md) for the bigger picture.

---

## Why this package exists

`crypto-lib` is the **trust core** of the suite. It exists so that the CLI,
the REST server, and any third-party caller can perform OpenPGP operations
through one well-tested code path with zero hidden state.

Design rules:

- All key material is supplied by the caller as ASCII-armored strings.
- The library never reads from or writes to the filesystem.
- The library never holds operator keys in module-level state.
- Passphrases live as long as the function call and are never logged.
- A regression-guard test fails the build if anyone reintroduces the legacy
  `enums.ts` (with `keySize512`/`keySize1024`) or `config/config.ts` (with a
  NIST P-256 default) modules.

---

## Installation

```bash
# inside an existing Node.js / TypeScript project
pnpm add @sebastienrousseau/crypto-lib
# or: npm install / yarn add
```

Requires **Node.js ≥ 20.18**.

---

## API

Eight pure async functions, fully typed. Import named or default:

```ts
import {
  generate,
  encrypt,
  decrypt,
  sign,
  verify,
  revoke,
  reformat,
  session,
} from "@sebastienrousseau/crypto-lib";

// or
import CryptoLib from "@sebastienrousseau/crypto-lib";
await CryptoLib.generate({ ... });
```

| Function | Signature | Returns |
|---|---|---|
| `generate` | `(input: GenerateInput) => Promise<GenerateOutput>` | `{ publicKey, privateKey, revocationCertificate }` |
| `encrypt`  | `(input: EncryptInput) => Promise<string>` | armored ciphertext |
| `decrypt`  | `(input: DecryptInput) => Promise<DecryptOutput>` | `{ data, signatures[] }` |
| `sign`     | `(input: SignInput) => Promise<string>` | armored cleartext-signed message OR detached signature |
| `verify`   | `(input: VerifyInput) => Promise<VerifyOutput>` | `{ valid: true, signedBy }` — **throws** on invalid/missing signature |
| `revoke`   | `(input: RevokeInput) => Promise<RevokeOutput>` | `{ publicKey, privateKey }` (revoked forms) |
| `reformat` | `(input: ReformatInput) => Promise<ReformatOutput>` | `{ publicKey, privateKey }` (re-issued self-signatures) |
| `session`  | `(input: SessionInput) => Promise<openpgp.SessionKey>` | session key honouring recipient algorithm prefs |

The full input/output type definitions live in
[`src/types/types.ts`](src/types/types.ts) and are re-exported from the
package root.

---

## Examples

### Generate an ECC key pair

```ts
import { generate } from "@sebastienrousseau/crypto-lib";

const key = await generate({
  name: "Jane Doe",
  email: "jane@doe.com",
  passphrase: "correct horse battery staple",
  type: "ecc",                            // default
  curve: "curve25519",                    // default
  keyExpirationTime: 60 * 60 * 24 * 365,  // 1 year (0 = never expires)
});

console.log(key.publicKey);             // -----BEGIN PGP PUBLIC KEY BLOCK-----
console.log(key.privateKey);            // -----BEGIN PGP PRIVATE KEY BLOCK-----
console.log(key.revocationCertificate); // -----BEGIN PGP PUBLIC KEY BLOCK-----
```

### Generate an RSA key pair (4096 bit)

```ts
const key = await generate({
  name: "Jane Doe",
  email: "jane@doe.com",
  passphrase: "correct horse battery staple",
  type: "rsa",
  rsaBits: 4096, // floor: 2048
});
```

### Encrypt to a recipient

```ts
import { encrypt } from "@sebastienrousseau/crypto-lib";

const ciphertext = await encrypt({
  message: "Hello Crypto Service Suite!",
  encryptionKey: recipientPublicKeyArmored,
});
```

### Encrypt + sign in one step

```ts
const ciphertext = await encrypt({
  message: "Hello Crypto Service Suite!",
  encryptionKey: recipientPublicKeyArmored,
  signingKey: {
    armored: senderPrivateKeyArmored,
    passphrase: "correct horse battery staple",
  },
});
```

### Decrypt + verify embedded signature

```ts
import { decrypt } from "@sebastienrousseau/crypto-lib";

const { data, signatures } = await decrypt({
  encryptedMessage: ciphertext,
  decryptionKey: {
    armored: recipientPrivateKeyArmored,
    passphrase: "correct horse battery staple",
  },
  verificationKey: senderPublicKeyArmored, // optional
});

console.log(data);              // "Hello Crypto Service Suite!"
console.log(signatures);        // [{ keyID: "ab12...", valid: true }]
```

> ⚠️ `decrypt` will **throw** if `verificationKey` is supplied and any
> signature fails to verify. The previous (pre-v0.0.3) implementation
> silently reported "verified" for any input — see the regression test
> `__tests__/lib/verify.test.ts` for the guard.

### Sign — cleartext

```ts
import { sign } from "@sebastienrousseau/crypto-lib";

const cleartextSigned = await sign({
  message: "Hello Crypto Service Suite!",
  signingKey: {
    armored: privateKeyArmored,
    passphrase: "correct horse battery staple",
  },
});
// -----BEGIN PGP SIGNED MESSAGE-----
```

### Sign — detached

```ts
const detachedSig = await sign({
  message: "Hello Crypto Service Suite!",
  signingKey: { armored: privateKeyArmored, passphrase: "..." },
  detached: true,
});
// -----BEGIN PGP SIGNATURE-----
```

### Verify

```ts
import { verify } from "@sebastienrousseau/crypto-lib";

// Cleartext-signed message:
const result = await verify({
  message: cleartextSigned,
  verificationKey: publicKeyArmored,
});

// Detached signature:
const result2 = await verify({
  message: "Hello Crypto Service Suite!",
  signature: detachedSig,
  verificationKey: publicKeyArmored,
});

console.log(result.valid);     // true
console.log(result.signedBy);  // "ab12cd34..."
```

`verify` **throws** on:

- a missing signature (a missing signature is not "valid"),
- any signature that fails to verify against the supplied keys.

### Revoke a key

```ts
import { revoke } from "@sebastienrousseau/crypto-lib";

const revoked = await revoke({
  privateKey: { armored: privateKeyArmored, passphrase: "..." },
  reason: { flag: 2, string: "compromised" },
  // RFC 4880 §5.2.3.23 reason flags:
  //   0 = no reason, 1 = superseded, 2 = compromised,
  //   3 = retired,   32 = user ID no longer valid
});

console.log(revoked.publicKey);  // -----BEGIN PGP PUBLIC KEY BLOCK----- (revoked)
```

### Reformat (rotate user ID / expiration)

```ts
import { reformat } from "@sebastienrousseau/crypto-lib";

const reformatted = await reformat({
  privateKey: { armored: privateKeyArmored, passphrase: "..." },
  name: "Jane D. Roe",
  email: "jane.roe@example.com",
  keyExpirationTime: 60 * 60 * 24 * 365 * 2, // 2 years
});
```

### Session key

```ts
import { session } from "@sebastienrousseau/crypto-lib";

const sk = await session({
  encryptionKey: recipientPublicKeyArmored,
  name: "Recipient",
  email: "recipient@example.com",
});

console.log(sk.algorithm);                    // e.g. "aes256"
console.log(Buffer.from(sk.data).toString("hex"));
```

---

## Error semantics

- All input-validation failures throw a plain `Error` with a descriptive
  message ("`generate: name and email are required`", etc.) — never an
  opaque cast.
- All openpgp-level failures (malformed armor, wrong passphrase, invalid
  signature) propagate as the openpgp error from the underlying library —
  catch them as `Error` instances at the call site.
- The library never logs to stdout/stderr.
- The library never writes to disk.

---

## Local development

```bash
# from the repo root
pnpm install --frozen-lockfile
pnpm --filter @sebastienrousseau/crypto-lib run build
pnpm --filter @sebastienrousseau/crypto-lib run test
pnpm --filter @sebastienrousseau/crypto-lib run lint
```

The package's source layout:

```
packages/crypto-lib/
├── src/
│   ├── lib/
│   │   ├── decrypt.ts
│   │   ├── encrypt.ts
│   │   ├── generate.ts
│   │   ├── reformat.ts
│   │   ├── revoke.ts
│   │   ├── session.ts
│   │   ├── sign.ts
│   │   ├── verify.ts
│   │   └── index.ts        ← named re-exports
│   ├── types/
│   │   └── types.ts        ← public input/output types
│   ├── bin/
│   │   └── cryptolib.ts    ← default + named re-exports
│   └── index.ts            ← package entrypoint
└── __tests__/
    ├── lib/                ← one spec per pure function
    ├── types/types.test.ts
    ├── cryptolib.test.ts   ← bin entry smoke test
    ├── index.test.ts       ← public API surface
    └── no-legacy-config.test.ts  ← regression guard
```

---

## Versioning

`crypto-lib` follows [semantic versioning](https://semver.org/). The public
API is the eight functions listed above. Internal helpers under
`src/lib/*.ts` and the layout of `src/types/types.ts` may change in patch
releases.

## Changelog

See [GitHub Releases](https://github.com/sebastienrousseau/crypto-service/releases).

## License

MIT — see [LICENSE](LICENSE). Copyright © Sebastien Rousseau.
