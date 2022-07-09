# 🔐 The Crypto Service Suite

![Banner representing Crypto Service Suite][crypto service suite]

[![npm](https://img.shields.io/npm/v/@sebastienrousseau/crypto-service.svg?style=for-the-badge\&color=f14041)](https://www.npmjs.com/package/@sebastienrousseau/crypto-service)
![Codacy grade](https://img.shields.io/codacy/grade/40d370244f3843f389094afe7719c4e4?style=for-the-badge)
[![Coverage Status](https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service/solid.svg?branch=main&style=for-the-badge\&color=blueviolet)](https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main)
[![Maintained with Lerna](https://img.shields.io/badge/maintained%20with-lerna-blue?style=for-the-badge)](https://lerna.js.org/)

[![Contributors][contributors-shield]](https://github.com/sebastienrousseau/crypto-service/graphs/contributors)
[![Forks][forks-shield]](https://github.com/sebastienrousseau/crypto-service/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge\&color=ff69b4)](https://opensource.org/licenses/MIT)
![Made with Love](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/made-with-love.svg)

[![FOSSA Status](https://app.fossa.com/api/projects/custom%2B3308%2Fgithub.com%2Fsebastienrousseau%2Fcrypto-service.svg?type=small)](https://app.fossa.com/projects/custom%2B3308%2Fgithub.com%2Fsebastienrousseau%2Fcrypto-service?ref=badge_small)

**[Website](https://crypto-service.co) • [Documentation](https://crypto-service/docs/) 
• [Report Bug](https://github.com/sebastienrousseau/crypto-service/issues) 
• [Request Feature](https://github.com/sebastienrousseau/crypto-service/issues) 
• [Contributing Guidelines](https://github.com/sebastienrousseau/crypto-service/blob/master/.github/CONTRIBUTING.md)**

***

## 📖 Table of Contents

<details>
<summary>Click to expand</summary>

- [Welcome to the Crypto Service Suite](#👋-welcome-to-the-crypto-service-suite)
- [Crypto CLI](#❯-crypto-cli)
- [Crypto Lib](#⚙️-crypto-lib)
- [Crypto Server](#🖥️-crypto-server)
- [Getting Started](#getting-started)
- [Installation](#🔧-installation)
- [Releases](#🔗-releases)
- [Semantic Versioning Policy](#🚥-semantic-versioning-policy)
- [Changelog](#✅-changelog)
- [Code of Conduct](#📖-code-of-conduct)
- [Our Values](#⭐️-our-values)
- [Contributing](#❤️-contributing)
- [License](#🥂-license)
- [Acknowledgements](#💖-acknowledgements)

</details>

![divider][divider]

## 👋 Welcome to the Crypto Service Suite

The Crypto Service Suite is a set of products that delivers common crypto 
functions.

It is a powerful and centralized cryptographic suite of security tools that 
solves common application crypto problems, including integration, data 
encryption, tokenization, transaction authorization, code-signing and key 
life-cycle management and other security services. 

The Crypto Service Suite Suite encompasses three products, [Crypto CLI][16], 
[Crypto Lib][6] and [Crypto Server][7] part of the Crypto Service Suite 
Applications.

[![Getting Started][getting started]](#getting-started)
[![Download Crypto Service Suite v0.0.2][download]][9]

Crypto Service Suite code is safe by design, and runs lightning-fast. It is 
based on [OpenPGP.js][1] - a JavaScript implementation of the OpenPGP protocol.
It implements [RFC4880][2] and parts of [RFC4880bis][3].

Crypto Service Suite can help you ensure the following:

- Authentication of communicating parties,
- Integrity of data,
- Message Level Encryption for encryption and non-repudiation.,
- Privacy of data.

![divider][divider]

## ❯ Crypto CLI

![Banner representing Crypto CLI][crypto cli]

Crypto CLI is a simple, yet powerful, command line interface that can be used to
perform common cryptographic operations from the command prompt or terminal.
[Learn more][16][>][16]

![divider][divider]

## ⚙️ Crypto Lib

![Banner representing Crypto Lib][crypto lib]

Crypto Lib is a powerful intuitive cryptographic JavaScript library that
encapsulates common algorithms, functions and provides an interface for
low-level cryptographic operations. [Learn more][6][>][6]

![divider][divider]

## 🖥️ Crypto Server

![Banner representing Crypto Server][crypto server]

Crypto Server is a [Fastify](https://www.fastify.io) web server that exposes
easy consumable REST APIs to perform low-level cryptographic operations. It is
implemented using Node.js and relies on Crypto Lib. [Learn more][7][>][7]

![divider][divider]

## Getting Started

> 🔴 Note: Crypto Service Suite is a [Node.js][12] module available through the
[npm registry][13]. Before installing, [download and install Node.js][12].
Node.js 12.20.0 or higher is required.

This allows you to always be on the latest version when we release new builds
with automatic upgrades.

Crypto Service Suite helps put you in control of your sensitive information.
You’ll find below details on how to get started and how to configure Crypto
Service Suite and its products.

![divider][divider]

## 🔧 Installation

The first step to using Crypto Service Suite is to download and install the
application and other required components.

1️⃣ Install Crypto Service Suite via [`npm`][13], [`yarn`][14] or [`pnpm`][15]
package managers to use Crypto Service Suite with Node.js or the Command Line
Interface:

- `npm i @sebastienrousseau/crypto-service`
- `yarn add @sebastienrousseau/crypto-service`
- `pnpm add @sebastienrousseau/crypto-service`

For users who are unable to install the Crypto Service Suite, released builds
can be manually downloaded from this repository's
[Releases page](https://github.com/sebastienrousseau/crypto-service/releases/).

You can also clone the main repository to get all source files including build
scripts: `git clone https://github.com/sebastienrousseau/crypto-service.git`

2️⃣ What's included?

Within the download you'll find all the crypto lib source files grouped into
the *dist* folder.

You'll see something like this:

```shell
.
├── COPYRIGHT
├── LICENSE
├── Makefile
├── README.md
├── Report.txt
├── index.js
├── package.json
└── src
    ├── bin
    │   └── crypto-service.js
    ├── data
    │   ├── decrypted.txt
    │   └── encrypted.txt
    ├── key
    │   ├── ecc.priv.pgp
    │   ├── ecc.pub.pgp
    │   ├── rsa.priv.pgp
    │   └── rsa.pub.pgp
    ├── lib
    │   ├── README.md
    │   ├── decrypt.js
    │   ├── encrypt.js
    │   ├── generate.js
    │   └── revoke-key.js
    └── server.js

5 directories, 20 files

```

3️⃣ Set up your app

You can get started with a simple app by running the following in your terminal:

```shell

> mkdir my-app
> cd my-app
> yarn add @sebastienrousseau/crypto-service -D
> yarn start

```
4️⃣ Try it out and let us know what you think!

![divider][divider]

## 🔗 Releases

Update your apps to use new features, and test your apps against API changes.

|Date|Download|Release Note|
| :-: | :-: | :-: |
|May 17, 2022|⬇️ [0.0.1][8]|📝 [Crypto Service Suite 0.0.1 Release Note][10]|
|May 30, 2022|⬇️ [0.0.2][9]|📝 [Crypto Service Suite 0.0.2 Release Note][11]|

![divider][divider]

## 🚥 Semantic Versioning Policy

For transparency into our release cycle and in striving to maintain backward
compatibility, `crypto-service` follows [semantic versioning](http://semver.org/)
and [ESLint's Semantic Versioning Policy](https://github.com/eslint/eslint#semantic-versioning-policy).

![divider][divider]

## ✅ Changelog

- [GitHub Releases](https://github.com/sebastienrousseau/crypto-service/releases)

![divider][divider]

## 📖 Code of Conduct

We are committed to preserving and fostering a diverse, welcoming community.
Please read our [Code of Conduct](https://github.com/sebastienrousseau/crypto-service/blob/master/.github/CODE-OF-CONDUCT.md).

![divider][divider]

## ⭐️ Our Values

- We believe perfection must consider everything.
- We take our passion beyond code into our daily practices.
- We are just obsessed about creating and delivering exceptional solutions.

![divider][divider]

## ❤️ Contributing

Thank you for using Crypto Service Suite! If you like the library, it would be 
great if you can give it a star ⭐ on [GitHub][17].

There are also many ways in which you can participate in this project, for
example:

* [Submit bugs and feature requests](https://github.com/sebastienrousseau/crypto-service/issues/new), and help us verify as they are checked in,
* Review [source code changes](https://github.com/sebastienrousseau/crypto-service/pulls), and help us improve our code quality,
* Review the [documentation](https://github.com/sebastienrousseau/crypto-service/docs) and make pull requests for anything from typos to additional and new content.

Please read carefully through our
[Contributing Guidelines](https://github.com/sebastienrousseau/crypto-service/blob/master/.github/CONTRIBUTING.md)
for further details on the process for submitting pull requests to us.

![divider][divider]

## 🥂 License

Copyright (c) Sebastien Rousseau. All rights reserved.

Licensed under the [MIT](LICENSE) license.

![divider][divider]

## 💖 Acknowledgements

[Crypto Service Suite](https://crypto-service.co) is beautifully crafted by
these people and a bunch of awesome
[contributors](https://github.com/sebastienrousseau/crypto-service/graphs/contributors).

| Contributors |
|---------|
|[![Sebastien Rousseau](https://avatars0.githubusercontent.com/u/1394998?s=117)](https://sebastienrousseau.co.uk)|
|[Sebastien Rousseau](https://github.com/sebastienrousseau)|

[1]: https://openpgpjs.org/
[2]: https://tools.ietf.org/html/rfc4880
[3]: https://tools.ietf.org/html/draft-ietf-openpgp-rfc4880bis-10
[4]: https://en.wikipedia.org/wiki/RSA_(cryptosystem)
[5]: https://en.wikipedia.org/wiki/Elliptic-curve_cryptography
[6]: https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-lib
[7]: https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-server
[8]: https://github.com/sebastienrousseau/crypto-service/archive/refs/tags/sebastienrousseau-crypto-service-0.0.1.zip
[9]: https://github.com/sebastienrousseau/crypto-service/archive/refs/tags/sebastienrousseau-crypto-service-0.0.2.zip
[10]: https://github.com/sebastienrousseau/crypto-service/releases/tag/sebastienrousseau-crypto-service-0.0.1
[11]: https://github.com/sebastienrousseau/crypto-service/releases/tag/sebastienrousseau-crypto-service-0.0.2
[12]: https://nodejs.org/en/
[13]: https://www.npmjs.com/
[14]: https://yarnpkg.com/getting-started
[15]: https://pnpm.io/motivation
[16]: https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-cli
[17]: https://github.com/sebastienrousseau/crypto-service

[contributors-shield]: https://img.shields.io/github/contributors/sebastienrousseau/crypto-service.svg?style=for-the-badge
[contributors-url]: https://github.com/sebastienrousseau/crypto-service/graphs/contributors
[crypto cli]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/crypto-cli-small.svg "crypto cli"
[crypto lib]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/crypto-lib-small.svg "crypto lib"
[crypto server]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/crypto-server-small.svg "crypto server"
[crypto service suite]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/crypto-service-logo.svg "crypto service suite"
[divider]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/divider.svg "divider"
[download]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/button-secondary.svg 
[forks-shield]: https://img.shields.io/github/forks/sebastienrousseau/crypto-service.svg?style=for-the-badge
[forks-url]: https://github.com/sebastienrousseau/crypto-service/network/members
[getting started]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/button-primary.svg 
[issues-shield]: https://img.shields.io/github/issues/sebastienrousseau/crypto-service.svg?style=for-the-badge
[issues-url]: https://github.com/sebastienrousseau/crypto-service/issues
[stars-shield]: https://img.shields.io/github/stars/sebastienrousseau/crypto-service.svg?style=for-the-badge
[stars-url]: https://github.com/sebastienrousseau/crypto-service/stargazers
