![Banner representing Crypto Service](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/crypto-server-logo.svg)

[![Maintained with Lerna](https://img.shields.io/badge/maintained%20with-lerna-blue?style=for-the-badge)](https://lerna.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge&logo=)](https://opensource.org/licenses/MIT)
![Made with Love](/assets/made-with-love.svg)

## Introduction to the Crypto Server

Crypto Server is a [Fastify](https://www.fastify.io) web server that exposes
easy consumable REST APIs to perform low-level cryptographic operations. It is
implemented using Node.js and relies on [**Crypto Lib**](https://github.com/sebastienrousseau/crypto-lib).

The cryptographic operations include:

- Digital Signing,
- Encryption and Decryption,
- Key Generation,
- Key Management,
- Pseudorandom Number Generation,
- Signature Verification.

This web server is built on [Fastify](https://www.fastify.io) - a fast and low
overhead web framework, for Node.js.

Development of this server is hosted by [GitHub](https://github.com) at the
following page:

- [https://github.com/sebastienrousseau/crypto-server](https://github.com/sebastienrousseau/crypto-server)

This source code is available to everyone under the standard
[MIT license](https://github.com/sebastienrousseau/crypto-server/blob/main/LICENSE).

## Installation

Crypto Server is a [Node.js](https://nodejs.org/en/) module available through
the [npm registry](https://www.npmjs.com/). Before installing,
[download and install Node.js](https://nodejs.org/en/download/). Node.js 12.20.0
or higher is required.

Installation is done using either `npm` or `yarn` package managers to use Crypto
Server with Node.js or the Command Line Interface:

- `npm i @sebastienrousseau/crypto-server`
- `yarn add @sebastienrousseau/crypto-server`

## Quick Start

On arrival of a new API request, the Crypto Server performs the operation in the
Cloud environment, subsequently the response is transferred back to the
requesting application. All operations coming through the server are monitored
so statistics can be made and acted upon. 

***
