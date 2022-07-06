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

## ❯ Welcome to Crypto CLI

Crypto CLI is a simple, yet powerful, command line interface that can be used to
perform common cryptographic operations from the command prompt or terminal.

![Crypto CLI][crypto-cli]

![divider][divider]

## ❯ Key Features

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

![divider][divider]
## ❯ Getting Started

> 🔴 Note: Crypto CLI is a [Node.js][7] module available through the
[npm registry][8]. Before installing, [download and install Node.js][7].
Node.js 12.20.0 or or later.

This allows you to always be on the latest version when we release new builds
with automatic upgrades.

### Installation

Install the Crypto CLI via [`npm`][8], [`yarn`][9] or [`pnpm`][10] package
managers:

- `npm i @sebastienrousseau/crypto-cli`
- `yarn add @sebastienrousseau/crypto-cli`
- `pnpm add @sebastienrousseau/crypto-cli`

### Other install methods

#### Via GitHub

For users who are unable to install the Crypto CLI, released builds can be 
manually downloaded from this repository's
[Releases page](https://github.com/sebastienrousseau/crypto-service/releases/).

## ❯ Quick Start

You can get started with a simple app by running the following in your terminal:

```shell

> mkdir my-app
> cd my-app
> yarn add @sebastienrousseau/crypto-cli -D
> yarn start

```

![divider][divider]

## ❯ Command line syntax

The Crypto CLI accepts multiple types of options. Options are a list of flags
and other parameters that can control the behavior of the Crypto CLI as a whole. 

Below is the full list of supported options for the Crypto CLI.

| Option | Description |
|---|---|
| help      | Displays the help message. |
| decrypt   | Decrypts a message. |
| encrypt   | Encrypts a message. |
| generate  | Generates a new OpenPGP key pair. Supports RSA and ECC keys. |
| reformat  | Reformats signature packets for a key. |
| revoke    | Revokes a key. |
| session   | Generate a new session key object. |
| sign      | Signs a message. |
| verify    | Verifies signatures of cleartext signed message. |

![divider][divider]

## ❯ What's included

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

## ❯ Contributing

There are many ways in which you can participate in this project, for example:

* [Submit bugs and feature requests](https://github.com/sebastienrousseau/crypto-service/issues/new), and help us verify as they are checked in,
* Review [source code changes](https://github.com/sebastienrousseau/crypto-service/pulls), and help us improve our code quality,
* Review the [documentation](https://github.com/sebastienrousseau/crypto-service/docs) and make pull requests for anything from typos to additional and new content.

## ❯ License

Copyright (c) Sebastien Rousseau. All rights reserved.

Licensed under the [MIT](LICENSE) license.

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

[divider]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/divider.svg
[crypto-cli]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-cli.svg "Crypto CLI"
