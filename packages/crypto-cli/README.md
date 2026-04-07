# ❯ @sebastienrousseau/crypto-cli

A prompts-driven interactive command-line interface for the
[Crypto Service Suite](https://github.com/sebastienrousseau/crypto-service).
Performs all eight OpenPGP operations from `crypto-lib` (generate, encrypt,
decrypt, sign, verify, revoke, reformat, session) without writing a single
flag.

[![NPM Version](https://img.shields.io/npm/v/@sebastienrousseau/crypto-cli.svg?style=flat-square)](https://www.npmjs.com/package/@sebastienrousseau/crypto-cli)
[![Coverage](https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service/main.svg?style=flat-square)](https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

> Part of the [Crypto Service Suite](https://github.com/sebastienrousseau/crypto-service).
> See the root [README](../../README.md) and
> [`docs/architecture.md`](../../docs/architecture.md) for the bigger picture.

---

## What it is (and isn't)

`crypto-cli` is a **prompt-driven REPL**, not a flag-based CLI. There is no
`crypto-cli encrypt --message ...` syntax. Run the binary, choose a command
from the menu, answer the prompts. This is intentional: passphrases never
end up in shell history, and the prompts can validate as you go.

If you need a scriptable, flag-based interface, call `crypto-lib` directly
from a Node.js script — see
[`packages/crypto-lib/README.md`](../crypto-lib/README.md#examples).

---

## Installation

```bash
# global install (puts `cryptocli` on your PATH)
pnpm add -g @sebastienrousseau/crypto-cli
# or: npm install -g / yarn global add

cryptocli
```

Or use it inside the workspace without installing globally:

```bash
# from the repo root
pnpm --filter @sebastienrousseau/crypto-cli start
```

Requires **Node.js ≥ 20.18**.

Locales: `en` (default) and `fr`. The CLI auto-detects from
`Intl.DateTimeFormat().resolvedOptions().locale` and falls back to `en` for
anything else.

---

## What you'll see

```
   ____                  _           ____ _     ___
  / ___|_ __ _   _ _ __ | |_ ___    / ___| |   |_ _|
 | |   | '__| | | | '_ \| __/ _ \  | |   | |    | |
 | |___| |  | |_| | |_) | || (_) | | |___| |___ | |
  \____|_|   \__, | .__/ \__\___/   \____|_____|___|
             |___/|_|

🔐 Crypto CLI

Crypto CLI is a simple, yet powerful, command line interface that can be
used to perform common cryptographic operations from the command prompt or
terminal.

? Select a function to execute.
❯ Generate    Generates a new OpenPGP key pair. Supports RSA and ECC keys.
  Encrypt     Encrypts a message.
  Decrypt     Decrypts a message.
  Reformat    Reformats signature packets for a key.
  Revoke      Revokes a key.
  Session     Generate a new session key object.
  Sign        Signs a message.
  Verify      Verifies signatures of cleartext signed message.
  Help        Get help on a command.
```

After picking a command, the CLI walks you through the inputs:

```
? Provide a first and last name › Jane Doe
? Provide an email address › jane@doe.com
? Key type › ECC (curve25519)
? Provide a passphrase › ********
? Key expiration in seconds (0 = never) › 31536000
? Output directory for the new key files › ./

🔑 Public key  : ./ecc-1733587200000.pub.asc
🔒 Private key : ./ecc-1733587200000.key.asc
🔏 Revocation  : ./ecc-1733587200000.cert.asc
```

---

## Commands

| Command  | What it does |
|----------|---|
| Generate | Generates a new OpenPGP key pair. Supports RSA (2048+) and ECC (curve25519 default). Writes the public key, private key, and revocation certificate to the chosen output directory as armored ASCII (`*.asc`). |
| Encrypt  | Reads a public key from disk, encrypts a message you type, and optionally co-signs with your private key. Writes armored ciphertext. |
| Decrypt  | Reads an armored encrypted message and your private key (with passphrase prompt) and writes the plaintext. Optionally verifies a sender's signature. |
| Sign     | Signs a message with your private key. Choose between cleartext-signed message (default) and detached signature. |
| Verify   | Verifies a cleartext-signed message OR a (plaintext, detached signature) pair against a public key. **Throws on invalid or missing signature.** |
| Revoke   | Generates a revocation for a key, including an RFC 4880 §5.2.3.23 reason flag (no reason / superseded / compromised / retired / user ID invalid). |
| Reformat | Re-issues self-signatures on a key with a new user ID and/or expiration. |
| Session  | Generates a session key honouring the recipient's algorithm preferences. Prints the algorithm and the key bytes hex-encoded. |
| Help     | Prints the version and the command list and exits. |

---

## I/O conventions

- **Inputs**: file paths to armored ASCII (`.asc`) keys, plus typed
  passphrases (entered through `prompts` so they're never echoed to the
  terminal or logged in shell history).
- **Outputs**: armored ASCII files written to your chosen directory. The
  CLI never overwrites a file silently — directories are created with
  `fs.mkdir({ recursive: true })` but file collisions will fail.
- **Cancellation**: pressing Ctrl+C at any prompt aborts cleanly. The
  CLI's exit code is `0` on a clean prompt-driven cancellation, `1` on a
  validation error or thrown exception.

---

## Examples

### Generate, then encrypt + decrypt a round trip

```bash
$ cryptocli                       # pick "Generate"
🔑 Public key  : ./ecc-1733587200000.pub.asc
🔒 Private key : ./ecc-1733587200000.key.asc
🔏 Revocation  : ./ecc-1733587200000.cert.asc

$ cryptocli                       # pick "Encrypt"
? Message to encrypt › Hello Crypto Service Suite!
? Path to recipient's armored public key (.asc) › ./ecc-1733587200000.pub.asc
? Also sign the message? › No
? Output path for the ciphertext › ./encrypted.asc
✅ Ciphertext written to ./encrypted.asc

$ cryptocli                       # pick "Decrypt"
? Path to the armored encrypted message › ./encrypted.asc
? Path to your armored private key (.asc) › ./ecc-1733587200000.key.asc
? Passphrase for the private key › ********
? (optional) path to a sender public key to verify embedded signatures ›
? Output path for the plaintext › ./decrypted.txt
✅ Plaintext written to ./decrypted.txt

$ cat ./decrypted.txt
Hello Crypto Service Suite!
```

### Sign + verify a detached signature

```bash
$ cryptocli                       # pick "Sign"
? Message to sign › the message
? Path to your armored private key (.asc) › ./ecc-1733587200000.key.asc
? Passphrase for the private key › ********
? Detached signature? › Yes
? Output path › ./signed.asc
✅ Detached signature written to ./signed.asc

$ printf 'the message' > ./plaintext.txt

$ cryptocli                       # pick "Verify"
? Path to the cleartext-signed message OR the plaintext (when using a detached signature) › ./plaintext.txt
? Path to the signer's armored public key (.asc) › ./ecc-1733587200000.pub.asc
? (optional) path to a detached signature › ./signed.asc
✅ Signature valid (signed by ab12cd34ef56...)
```

---

## Local development

```bash
# from the repo root
pnpm install --frozen-lockfile
pnpm --filter @sebastienrousseau/crypto-cli run build
pnpm --filter @sebastienrousseau/crypto-cli run test
pnpm --filter @sebastienrousseau/crypto-cli run lint

# run the built bin from the dist directory:
node packages/crypto-cli/dist/cli.js
```

Source layout:

```
packages/crypto-cli/
├── src/
│   ├── cli.ts                ← entrypoint with shebang + main()
│   ├── commands/
│   │   ├── decrypt.command.ts
│   │   ├── encrypt.command.ts
│   │   ├── generate.command.ts
│   │   ├── help.command.ts
│   │   ├── reformat.command.ts
│   │   ├── revoke.command.ts
│   │   ├── session.command.ts
│   │   ├── sign.command.ts
│   │   ├── verify.command.ts
│   │   └── index.ts          ← bundles all command handlers
│   ├── constants/
│   │   ├── en.ts             ← canonical Translations type
│   │   ├── fr.ts             ← typed against Translations
│   │   └── index.ts          ← synchronous locale resolver
│   ├── helpers/banner.ts     ← figlet welcome banner
│   └── utils/
│       ├── io.utils.ts       ← readArmored / writeArmored
│       ├── version.utils.ts  ← lazy package.json version reader
│       └── write.utils.ts    ← TTY-aware writeLn
└── __tests__/
    ├── cli.test.ts           ← spawn-based smoke test of dist/cli.js
    ├── constants/index.test.ts
    └── helpers/banner.test.ts
```

---

## Versioning

`crypto-cli` follows [semantic versioning](https://semver.org/). The
"public API" is the prompt flow: changing a prompt order, adding/removing
a top-level command, or changing the output filename pattern is a minor
version bump. Cosmetic copy changes are patch.

## Changelog

See [GitHub Releases](https://github.com/sebastienrousseau/crypto-service/releases).

## License

MIT — see [LICENSE](LICENSE). Copyright © Sebastien Rousseau.
