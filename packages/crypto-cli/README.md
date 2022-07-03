# Crypto CLI

![Banner representing the Crypto Lib Command Line Interface (CLI)](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/crypto-cli-logo.svg)

[![NPM Version](https://img.shields.io/npm/v/solid-js.svg?style=for-the-badge)](https://www.npmjs.com/package/@sebastienrousseau/crypto-cli)
[![Maintained with Lerna](https://img.shields.io/badge/maintained%20with-lerna-blue?style=for-the-badge)](https://lerna.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge&logo=)](https://opensource.org/licenses/MIT)
![Made with Love](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/made-with-love.svg)

**[Website](https://cryptocli.io) • [Documentation](https://cryptocli.io/docs/) 
• [Submit an Issue](https://github.com/sebastienrousseau/crypto-service/issues) 
• [Contributing Guidelines](https://github.com/sebastienrousseau/crypto-service/blob/master/.github/CONTRIBUTING.md)**

***

## Welcome to Crypto CLI

Crypto CLI is a simple, yet powerful, command line interface that can be used to
perform common cryptographic operations from the command prompt or terminal.

## Key Features

The cryptographic operations include:

- Authentication via Digital Signature,
- Confidentiality via Encryption and Decryption,
- Compression,
- Key Generation,
- Key Management,
- Pseudorandom Number Generation,
- Signature Verification.

This library is based on [OpenPGP.js][1] - a JavaScript implementation of the
OpenPGP protocol. It implements [RFC4880][2] and parts of [RFC4880bis][3].

Development of this library is hosted by [GitHub][4] at the [following page][5].
Source code is available to everyone under the standard [MIT license][6].

## Getting Started

Crypto CLI is a [Node.js][7] module available through the
[npm registry][8]. Before installing, [download and install Node.js][7].
Node.js 12.20.0 or higher is required.

Installation is done using either [`npm`][8], [`yarn`][9] or [`pnpm`][10]
package managers to use Crypto CLI with Node.js or the Command Line Interface:

- `npm i @sebastienrousseau/crypto-cli`
- `yarn add @sebastienrousseau/crypto-cli`
- `pnpm add @sebastienrousseau/crypto-cli`

<details>
 
<summary>Quick Start</summary>

You can get started with a simple app by running the following in your terminal:

```shell

> mkdir my-app
> cd my-app
> yarn add @sebastienrousseau/crypto-cli -D # or npm or pnpm
> yarn start

```
</details>

## What's included

Within the download you'll find all the crypto lib source files grouped into
the *dist* folder.

You'll see something like this:

```shell
.
├── COPYRIGHT
├── Makefile
├── Report.txt
├── cli.d.ts
├── cli.d.ts.map
├── cli.js
├── cli.js.map
├── commands
│   ├── decrypt.command.d.ts
│   ├── decrypt.command.d.ts.map
│   ├── decrypt.command.js
│   ├── decrypt.command.js.map
│   ├── encrypt.command.d.ts
│   ├── encrypt.command.d.ts.map
│   ├── encrypt.command.js
│   ├── encrypt.command.js.map
│   ├── generate.command.d.ts
│   ├── generate.command.d.ts.map
│   ├── generate.command.js
│   ├── generate.command.js.map
│   ├── help.command.d.ts
│   ├── help.command.d.ts.map
│   ├── help.command.js
│   ├── help.command.js.map
│   ├── index.d.ts
│   ├── index.d.ts.map
│   ├── index.js
│   ├── index.js.map
│   ├── reformat.command.d.ts
│   ├── reformat.command.d.ts.map
│   ├── reformat.command.js
│   ├── reformat.command.js.map
│   ├── revoke.command.d.ts
│   ├── revoke.command.d.ts.map
│   ├── revoke.command.js
│   ├── revoke.command.js.map
│   ├── session.command.d.ts
│   ├── session.command.d.ts.map
│   ├── session.command.js
│   ├── session.command.js.map
│   ├── sign.command.d.ts
│   ├── sign.command.d.ts.map
│   ├── sign.command.js
│   ├── sign.command.js.map
│   ├── verify.command.d.ts
│   ├── verify.command.d.ts.map
│   ├── verify.command.js
│   └── verify.command.js.map
├── helpers
│   ├── banner.d.ts
│   ├── banner.d.ts.map
│   ├── banner.js
│   └── banner.js.map
├── key
│   ├── key.d.ts
│   ├── key.d.ts.map
│   ├── key.js
│   ├── key.js.map
│   ├── rsa-reformat.cert
│   ├── rsa-reformat.key
│   ├── rsa-reformat.pub
│   ├── rsa-revoke.key
│   ├── rsa-revoke.pub
│   ├── rsa.cert
│   ├── rsa.key
│   └── rsa.pub
├── package.json
└── utils
    ├── version.utils.d.ts
    ├── version.utils.d.ts.map
    ├── version.utils.js
    ├── version.utils.js.map
    ├── write.utils.d.ts
    ├── write.utils.d.ts.map
    ├── write.utils.js
    └── write.utils.js.map

4 directories, 72 files

```

## Quick Start

### Generating a new RSA key pair

[RSA][11] is a public-key algorithm for encrypting and signing messages. To
generate a Rivest-Shamir-Adelman (RSA) public key pair:

-   Open Terminal for Mac or Command Prompt for Windows,

-   Enter the following example command that will start the generation process
in the `dist/` directory.

```js
yarn start \
  --name "Jane Doe" \
  --email "jane@doe.com" \
  --passphrase "123456789abcdef" \
  --type "rsa" \
  --curve "" \
  --bits 2048 \
  --expiration 0 \
  --format armored \
  --sign true
```

This starts generating a 2048-bit RSA key pair, encrypts them with the password
provided and writes them to a file in the [key](src/key/) directory with a pgp
extension.

***

### Generating a new Elliptic-curve cryptography (ECC) key pair

[Elliptic-curve cryptography (ECC)][12] is an alternative technique to RSA. It
generates security between key pairs for public key encryption by using the
mathematics of elliptic curves. Elliptic curve cryptography provides stronger
security per bits of key, which allows for much faster operations.

Currently the following curves are supported:

| Curve           | Encryption | Signature | NodeCrypto | WebCrypto |
|:---------------:|:----------:|:---------:|:----------:|:---------:|
| curve25519      | ECDH       | N/A       | No         | No        |
| ed25519         | N/A        | EdDSA     | No         | No        |
| p256            | ECDH       | ECDSA     | Yes        | Yes       |
| p384            | ECDH       | ECDSA     | Yes        | Yes       |
| p521            | ECDH       | ECDSA     | Yes        | Yes       |
| brainpoolP256r1 | ECDH       | ECDSA     | Yes        | No        |
| brainpoolP384r1 | ECDH       | ECDSA     | Yes        | No        |
| brainpoolP512r1 | ECDH       | ECDSA     | Yes        | No        |
| secp256k1       | ECDH       | ECDSA     | Yes        | No        |

To generate an Elliptic Curve Cryptography (ECC) key pair:

-   Open Terminal for Mac or Command Prompt for Windows,
 
-   Enter the following example command that will start the generation process
in the `dist/` directory.

```js
yarn start \
  --name "Jane Doe" \
  --email "jane@doe.com" \
  --passphrase "123456789abcdef" \
  --type "ecc" \
  --curve curve25519 \
  --bits null \
  --expiration 0 \
  --format armored \
  --sign true
```

This starts generating an Elliptic Curve Cryptography (ECC) key pair, encrypts
them with the password provided and writes them to a file in the [key](src/key/)
directory with a pgp extension.

***

### Encrypting and Signing Data

Encryption is the transformation of data into a form in which it cannot be made
sense of without the use of some key. Such transformed data is referred to as
`ciphertext`.

Crypto CLI makes it easy and painless to encrypt and sign data.

To encrypt a message:

-   Open Terminal for Mac or Command Prompt for Windows,

-   Run the yarn start

-   Enter the following example command that will start the encryption process
in the `dist/` directory.

```js
node dist/lib/encrypt.js \
  --passphrase '123456789abcdef' \
  --message 'Hello Crypto Service APIs!'
```

***

### Decrypting and Verifying Signatures

Decryption restores encrypted data to to its original (cleartext or plaintext)
form. Decrypting data and verifying signatures is being done similarly in Crypto
Lib.

To decrypt a message:

-   Open Terminal for Mac or Command Prompt for Windows,

-   Enter the following example command that will start the decryption process
in the `dist/` directory.

```js
node dist/lib/decrypt.js \
  --passphrase 'passphrase' \
  --encryptedMessage 'encryptedMessage' \
  --publicKey 'publicKey'

```

[1]: https://openpgpjs.org/
[2]: https://tools.ietf.org/html/rfc4880
[3]: https://tools.ietf.org/html/draft-ietf-openpgp-rfc4880bis-10
[4]: https://github.com
[5]: https://github.com/sebastienrousseau/crypto-service
[6]: https://github.com/sebastienrousseau/crypto-service/blob/main/LICENSE
[7]: https://nodejs.org/en/
[8]: https://www.npmjs.com/
[9]: https://yarnpkg.com/getting-started
[10]: https://pnpm.io/motivation
[11]: https://en.wikipedia.org/wiki/RSA_(cryptosystem)
[12]: https://en.wikipedia.org/wiki/Elliptic-curve_cryptography
