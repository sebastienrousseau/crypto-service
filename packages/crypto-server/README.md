![Banner representing Crypto Service](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/crypto-server-logo.svg)

[![Maintained with Lerna](https://img.shields.io/badge/maintained%20with-lerna-blue?style=for-the-badge)](https://lerna.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge&logo=)](https://opensource.org/licenses/MIT)
![Made with Love](/assets/made-with-love.svg)

## Welcome to Crypto Server

Crypto Server is a [Fastify](https://www.fastify.io) web server that exposes
easy consumable REST APIs to perform low-level cryptographic operations. It is
implemented using Node.js and relies on [**Crypto Lib**](https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-lib).

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

## Getting Started

Crypto Server is a [Node.js](https://nodejs.org/en/) module available through
the [npm registry](https://www.npmjs.com/). Before installing,
[download and install Node.js](https://nodejs.org/en/download/). Node.js 12.20.0
or higher is required.

Installation is done using either `npm` or `yarn` package managers to use Crypto
Server with Node.js or the Command Line Interface:

- `npm i @sebastienrousseau/crypto-server`
- `yarn add @sebastienrousseau/crypto-server`

## ⚡️ Quick start

### Starting the Crypto Server

- Open Terminal for Mac or Command Prompt for Windows,
- Enter one of the following commands to start the Crypto Server:   

#### NPM

- `npm run start:server`

#### Yarn

- `yarn start:server`

This will start the Crypto Server on your local machine with the following
environment details:

- Protocol: http,
- Hostname: localhost,
- Port: 3000,
- IP: 127.0.0.1.

The Crypto Server should be listening on
[http://localhost:3000/](http://localhost:3000/)

### What are the Crypto Service APIs?

The Crypto Service APIs give you access to a range of security and encryption
solutions to perform low-level cryptographic operations, key storage operations,
protect static data, and securely share secrets.

On arrival of a new API request, the Crypto Server performs the request
operation in the host environment, subsequently the response is transferred back
to the requesting application. All operations that are performed andd coming
through the Crypto Server are monitored so statistics can be made and acted upon
. 

## Commands & Options

### `/generate`

This endpoint allows you to create a new Key Pair.

### Headers

|Content-Type|Value|Description|
|---|---|---|
|type|rsa|The primary key algorithm type: ECC (default) or RSA.|
|bits|2048|Number of bits for RSA keys (defaults to 4096 bits).|
|name|Jane Doe|First name and Last name|
|email|jane@doe.com|Email address|
|passphrase|123456789abcdef|The passphrase used to encrypt the generated private key.|
|curve|null|Elliptic curve for ECC keys: curve25519 (default), p256, p384, p521, secp256k1, brainpoolP256r1, brainpoolP384r1, or brainpoolP512r1.|
|expiration|0|Number of seconds from the key creation time after which the key expires.|
|format|armored|Format of the output keys e.g. 'armored' | 'object' | 'binary'.|

```shell
curl --location --request GET 'http://localhost:3000/v1/generate' \
--header 'type: rsa' \
--header 'bits: 2048' \
--header 'name: Jane Doe' \
--header 'email: jane@doe.com' \
--header 'passphrase: 123456789abcdef' \
--header 'curve: null' \
--header 'expiration: 0' \
--header 'format: armored'
```
## Contributing to Crypto Server

Contributions to Crypto Server are welcomed and encouraged! Please see our 
[Contributing Guidelines](https://github.com/sebastienrousseau/crypto-server/blob/master/.github/CONTRIBUTING.md).
for further details on the process for submitting pull requests to us.

***
