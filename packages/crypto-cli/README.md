# Crypto CLI

![Banner representing Crypto CLI](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/crypto-cli-logo.svg)

[![NPM Version](https://img.shields.io/npm/v/solid-js.svg?style=for-the-badge)](https://www.npmjs.com/package/@sebastienrousseau/crypto-cli)
[![Maintained with Lerna](https://img.shields.io/badge/maintained%20with-lerna-blue?style=for-the-badge)](https://lerna.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge&logo=)](https://opensource.org/licenses/MIT)
![Made with Love](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/made-with-love.svg)

**[Website](https://cryptocli.io) • [Documentation](https://cryptocli.io/docs/) 
• [Submit an Issue](https://github.com/sebastienrousseau/crypto-service/issues) 
• [Contributing Guidelines](https://github.com/sebastienrousseau/crypto-cli/blob/master/.github/CONTRIBUTING.md)**

***

## Welcome to Crypto CLI

The Crypto Lib Command Line Interface (CLI) is a unified tool to perform common
cryptographic operations such as key generation, data encryption, digital
signing, and signature verification which are invoked from the command prompt or
terminal.

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
> yarn add @sebastienrousseau/crypto-cli -D # or yarn or pnpm
> yarn start \
--name "Jane Doe" \
--email "jane@doe.com" \
--passphrase "123456789abcdef" \
--type "rsa" \
--curve "" \
--bits 2048 \
--expiration 0 \
--format armored \

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
├── bin
│   ├── crypto-cli.d.ts
│   ├── crypto-cli.d.ts.map
│   ├── crypto-cli.js
│   ├── crypto-cli.js.map
│   ├── cryptolib.d.ts
│   ├── cryptolib.d.ts.map
│   ├── cryptolib.js
│   └── cryptolib.js.map
├── config
│   ├── config.d.ts
│   ├── config.d.ts.map
│   ├── config.js
│   └── config.js.map
├── enums.d.ts
├── enums.d.ts.map
├── enums.js
├── enums.js.map
├── index.d.ts
├── index.d.ts.map
├── index.js
├── index.js.map
├── key
│   ├── key.d.ts
│   ├── key.d.ts.map
│   ├── key.js
│   └── key.js.map
├── lib
│   ├── decrypt.d.ts
│   ├── decrypt.d.ts.map
│   ├── decrypt.js
│   ├── decrypt.js.map
│   ├── encrypt.d.ts
│   ├── encrypt.d.ts.map
│   ├── encrypt.js
│   ├── encrypt.js.map
│   ├── generate.d.ts
│   ├── generate.d.ts.map
│   ├── generate.js
│   ├── generate.js.map
│   ├── generateSessionKey.d.ts
│   ├── generateSessionKey.d.ts.map
│   ├── generateSessionKey.js
│   ├── generateSessionKey.js.map
│   ├── index.d.ts
│   ├── index.d.ts.map
│   ├── index.js
│   ├── index.js.map
│   ├── reformat.d.ts
│   ├── reformat.d.ts.map
│   ├── reformat.js
│   ├── reformat.js.map
│   ├── revoke.d.ts
│   ├── revoke.d.ts.map
│   ├── revoke.js
│   ├── revoke.js.map
│   ├── session.d.ts
│   ├── session.d.ts.map
│   ├── session.js
│   ├── session.js.map
│   ├── sign.d.ts
│   ├── sign.d.ts.map
│   ├── sign.js
│   ├── sign.js.map
│   ├── verify.d.ts
│   ├── verify.d.ts.map
│   ├── verify.js
│   └── verify.js.map
├── package.json
└── types
    ├── types.d.ts
    ├── types.d.ts.map
    ├── types.js
    └── types.js.map

5 directories, 72 files

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
