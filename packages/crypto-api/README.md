# 🚀 Crypto API

![Banner representing the Crypto Application Programming Interface (API)](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/crypto-api-logo.svg)

[![NPM Version](https://img.shields.io/npm/v/solid-js.svg?style=for-the-badge)](https://www.npmjs.com/package/@sebastienrousseau/crypto-api)
[![Coverage Status](https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service/solid.svg?branch=main\&style=for-the-badge\&color=blueviolet)](https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main)
[![Maintained with Lerna](https://img.shields.io/badge/maintained%20with-lerna-blue?style=for-the-badge)](https://lerna.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge\&logo=)](https://opensource.org/licenses/MIT)
![Made with Love](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/made-with-love.svg)

**[Website](https://crypto-api.io) • [Documentation](https://crypto-api.io/docs/)
• [Submit an Issue](https://github.com/sebastienrousseau/crypto-service/issues)
• [Contributing Guidelines](https://github.com/sebastienrousseau/crypto-service/blob/master/.github/CONTRIBUTING.md)**

***

## 👋 Welcome to Crypto API

Crypto API is a set of portable APIs for common cryptographic operations such as
data encryption, tokenisation, transaction authorization, code-signing and key
life-cycle management and other security services.

[![Getting Started][getting started]](#getting-started)
[![Download Crypto API][download]][8]

![divider][divider]

## ✨ Key Features

The Crypto API provides a range of key artefacts and tools to assist you with
cryptographic operations.

The distribution includes the following:

1.  A **Postman collection file** that provides a set of predefined API requests
    to help you interact with [Crypto Server][13].

1.  A **Postman environment configuration file** that provides key parameters to
    configure your API requests.

1.  A **Markdown documentation file** that contains the API documentation.

The cryptographic operations include:

- Authentication via Digital Signature,
- Confidentiality via Encryption and Decryption,
- Compression,
- Key Generation,
- Key Management,
- Pseudorandom Number Generation,
- Signature Verification.

Development of this library is hosted by [GitHub][1] at the [following page][2].
Source code is available to everyone under the standard [MIT license][3].

![divider][divider]

## Getting Started

👉 Before you begin: » Make sure you have downloaded [Postman][14] and installed
it on your computer. Alternatively, you can sign up to use the [web version][15]
of Postman.

Postman is an API development environment that makes sending API requests very
easy.

![divider][divider]

## 🔧 Installation

The first step to using Crypto API is to download and install the
application and other required components.

1️⃣ Install the Crypto API via [`npm`][5], [`yarn`][6] or [`pnpm`][7] package
managers:

- `npm i @sebastienrousseau/crypto-api`
- `yarn add @sebastienrousseau/crypto-api`
- `pnpm add @sebastienrousseau/crypto-api`

For users who are unable to install the Crypto API, released builds can be
manually downloaded from this repository's
[Releases page](https://github.com/sebastienrousseau/crypto-service/releases/).

### What's included

Within the download you'll find all the crypto lib source files grouped into
the *dist* folder.

You'll see something like this:

```shell
.
├── @types
│   ├── types.d.ts
│   ├── types.d.ts.map
│   ├── types.js
│   └── types.js.map
├── COPYRIGHT
├── Makefile
├── Report.txt
├── collections
│   └── postman_collection.json
├── environments
│   └── postman_environment.json
├── index.d.ts
├── index.d.ts.map
├── index.js
├── index.js.map
├── package.json
└── utils
    ├── index.d.ts
    ├── index.d.ts.map
    ├── index.js
    └── index.js.map

4 directories, 18 files

```

2️⃣ Import the "Crypto API" Postman collection into Postman.

-   Open the Postman application, and select **Import**. On the File tab, select
Upload Files.

![Postman][postman]

-   Browse your computer and select the `postman_collection.json` file in the 
`collections` folder, then select **Open**.

-   Select Import.

-   In the left navigation, select Collections, and expand 
`🔐 The Crypto Service Suite APIs`. All the API requests in the collection 
should be displayed.

![Postman Collections][collections]

3️⃣ Set up variables in Postman

-   Click the gear icon in the upper right corner of the Postman app and select 
Manage Environments.

-   Click the Import button to import the `postman_environment.json` file in the 
`environments` folder, then select **Open**.

![Postman Environments][environments]

-   Click the drop-down in the upper right corner of the Postman app to select
the imported environment. Once you select an environment, you can access
variables within the active environmental scope.

4️⃣ You can get started with a simple app by running the following in your terminal:

```shell

> mkdir my-app
> cd my-app
> yarn add @sebastienrousseau/crypto-api -D
> yarn start

```

5️⃣ Try it out and let us know what you think!

![divider][divider]

## ❯ Crypto Application Programming Interface (API) syntax

The Crypto API accepts multiple types of options. Options are a list of flags
and other parameters that can control the behavior of the Crypto API as a
whole.

Below is the full list of supported options for the Crypto API.

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
| verify    | Verifies signatures of clear text signed message. |

![divider][divider]

## 🚥 Semantic Versioning Policy

For transparency into our release cycle and in striving to maintain backward
compatibility, `crypto-api` follows [semantic versioning](http://semver.org/)
and [ESLint's Semantic Versioning Policy](https://github.com/eslint/eslint#semantic-versioning-policy).

![divider][divider]

## ✅ Changelog

- [GitHub Releases](https://github.com/sebastienrousseau/crypto-service/releases)

![divider][divider]

## ❤️ Contributing

Thank you for using Crypto API! If you like the library, it would be great if
you can give it a star ⭐ on [GitHub][2].

There are also many ways in which you can participate in this project, for
example:

-   [Submit bugs and feature requests][9], and help us verify as they are
    checked in,

-   Review [source code changes][10], and help us improve our code quality,

-   Review the [documentation][11] and make pull requests for anything from
    typos to additional and new content.

![divider][divider]

## 🥂 License

Copyright (c) Sebastien Rousseau. All rights reserved.

Licensed under the [MIT](LICENSE) license.

![divider][divider]

## 🏢 Acknowledgements

[Crypto Service Suite](https://crypto-service.co) is beautifully crafted by
these people and a bunch of awesome [contributors][12].

| Contributors |
|---------|
|[![Sebastien Rousseau](https://avatars0.githubusercontent.com/u/1394998?s=117)](https://sebastienrousseau.co.uk)|
|[Sebastien Rousseau](https://github.com/sebastienrousseau)|

[1]: https://github.com

[2]: https://github.com/sebastienrousseau/crypto-service

[3]: https://github.com/sebastienrousseau/crypto-service/blob/main/LICENSE

[4]: https://www.postman.com/downloads/

[5]: https://www.npmjs.com/

[6]: https://yarnpkg.com/getting-started

[7]: https://pnpm.io/motivation

[8]: https://github.com/sebastienrousseau/crypto-service/packages/

[9]: https://github.com/sebastienrousseau/crypto-service/issues/new

[10]: https://github.com/sebastienrousseau/crypto-service/pulls

[11]: https://github.com/sebastienrousseau/crypto-service/docs

[12]: https://github.com/sebastienrousseau/crypto-service/graphs/contributors

[13]: https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-server

[14]: https://www.postman.com/downloads/

[15]: https://www.postman.com/


[divider]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/divider.svg

[crypto-api]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-api.svg "Crypto API"

[getting started]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/button-primary.svg "Getting Started"

[download]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/button-secondary.svg "Download"

[postman]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/postman.svg "Postman"

[collections]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/collections.svg "Collections"

[Environments]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/environments.svg "Environments"
