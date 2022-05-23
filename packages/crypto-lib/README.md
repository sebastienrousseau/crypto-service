# Crypto Lib

![Banner representing Crypto Lib](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/crypto-lib-logo.svg)

[![Maintained with Lerna](https://img.shields.io/badge/maintained%20with-lerna-blue?style=for-the-badge)](https://lerna.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge&logo=)](https://opensource.org/licenses/MIT)
![Made with Love](/assets/made-with-love.svg)

***

## Introduction to the Crypto Library

Crypto Lib is a powerful intuitive cryptographic JavaScript library that
encapsulates common algorithms, functions and provides an interface for
low-level cryptographic operations.

The cryptographic operations include:

- Digital Signing,
- Encryption and Decryption,
- Key Generation,
- Key Management,
- Pseudorandom Number Generation,
- Signature Verification,

This library is based on [OpenPGP.js](https://openpgpjs.org/) - a JavaScript
implementation of the OpenPGP protocol. It implements [RFC4880](https://tools.ietf.org/html/rfc4880)
and parts of [RFC4880bis](https://tools.ietf.org/html/draft-ietf-openpgp-rfc4880bis-10).

Development of this library is hosted by [GitHub](https://github.com) at the
following page:

- [https://github.com/sebastienrousseau/crypto-service](https://github.com/sebastienrousseau/crypto-service)

This source code is available to everyone under the standard
[MIT license](https://github.com/sebastienrousseau/crypto-service/blob/main/LICENSE).

## Installation

Crypto Lib is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/). Before installing,
[download and install Node.js](https://nodejs.org/en/download/). Node.js 12.20.0
or higher is required.

Installation is done using either `npm` or `yarn` package managers to use Crypto
Lib with Node.js or the Command Line Interface:

- `npm i @sebastienrousseau/crypto-lib`
- `yarn add @sebastienrousseau/crypto-lib`

## Quick Start

### Generate a new RSA key pair

[RSA](https://en.wikipedia.org/wiki/RSA_\(cryptosystem\)) is a public-key
algorithm for encrypting and signing messages.

To generate a Rivest-Shamir-Adelman (RSA) public key pair:

- Open Terminal for Mac or Command Prompt for Windows,
- Enter the following example command that will start the generation process.

```console
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

### Generate a new Elliptic-curve cryptography (ECC) key pair

[Elliptic-curve cryptography (ECC)](https://en.wikipedia.org/wiki/Elliptic-curve_cryptography)
is an alternative technique to RSA. It generates security between key pairs for
public key encryption by using the mathematics of elliptic curves. Elliptic
curve cryptography provides stronger security per bits of key, which allows for
much faster operations.

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

- Open Terminal for Mac or Command Prompt for Windows,
- Enter the following example command that will start the generation process.

```console
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
them with the password provided and writes them to a file in the
[key](src/key/) directory with a pgp extension.

***

### Encrypt Data

Encryption is the transformation of data into a form in which it cannot be made
sense of without the use of some key. Such transformed data is referred to as
`ciphertext`.

To encrypt a message:

- Open Terminal for Mac or Command Prompt for Windows,
- Run the yarn start
- Enter the following example command that will start the encryption process.

```console
node src/lib/encrypt.js \
  --passphrase '123456789abcdef' \
  --message 'Hello Crypto Service APIs!'
```

***

### Decrypt Data

Decryption restores encrypted data to to its original (cleartext or plaintext)
form.

To decrypt a message:

- Open Terminal for Mac or Command Prompt for Windows,
- Enter the following example command that will start the decryption process.

```console
node src/lib/decrypt.js \
  --passphrase '123456789abcdef' \
  --message 'LS0tLS1CRUdJTiBQR1AgTUVTU0FHRS0tLS0tCgp3Y0ZNQXpMNWFTdVU0RWM4QVEvL1RlZzN6bzFiMSszNW9lN3l6NDFpRS9LVlNZYUJYSEFESTNpbVJodlQKeXlRczdFc29iYTdoUUx4dFZESjEyc3ZNU25YUWk2Y1FVNXd4cGo1L3VENUFOT2ZuN0hVSkYrSExINlRNCjNBWktZNUFLRk40VUZBK0hQRy9GSHlaNVhxVzRLd0hpL3ZjVWxSejRreWJDc2VxYmZoY01hU0NJdHRKbwpmWkNOcTFZNEhiR1hBV1BQWXExV0tRZnl0RnRyWWlQODU3VE5hc21XNTJKUjVMQUZ5OFdzdnZNTmM3Z3AKQ0RFcUIyVWQwRmJSNEZOU2tvTXFhN3FScXFqS1V2ei9odU9ieVVsOW94RVpGVGNac1hwSVQ1QkE5WUtECmpvY1pVSE1hTjZkbnFJTk8rcWVBZWM4R1FjbEUxVVk0RWhNcEhjUktkZEJaY2pjaE0xbW9oaEMxb0Q4aQpUTVBlRU5XcDg0SGh3cVp1UjRNNmxUQjBqSUhZbytuMXpMbm0vRUFtcDdoc3VvSEFYY3pqSFhVYVE3M2IKOEZ5UWlENW1IMU1wWHRoWjVheXNRTklmRkY5TUdOQ1paWXExNitHSFQvbmJCTDNyUmU2dENCUUFRTnVaCksydnNQeThGZlJyYmVBR0llZHllOFZIUGJFYXNsNWF4TVBwc08yaUtjV3dNN1QvZjVaeG5FRUxWem5UeApHQnA5MHFKMUFUNGtVWVNOejYvZC9aT2JUVVV3WWdkKzdUNDdxQ3VTMjYxVlJpL0Jiblh1Z2pLRk90VlEKMEhpU1VKbTlCbGhFR2s3OWg3RGJuZmx0ZFc4dFRCNE9CdXJxUHRVaHRLS2hHL3JhYUY3YlFrVVowUktNCmQ0SllOM0sySmhBL2ovaHIySEE4ZUpWZ0NNVm9McXJyZW8xazNHbGxIWkxTd2RBQmJtaXpZL1JZd2JDUQpUeG91TW5KNjhvZmVtSHNrSW1MdGx2OUtBOElQVEY4UXp3enZRcmpNRGRtclg2V09QTGtKQ3JiV1JKbHcKV25NWlBkVGpzSzdicnVNOTByZXhLeFowSGZVL050V3BvZ251L3dOYVBHZ1NRbEZhdHZhclJFQlNEaExaCndNYVE2ZWkycUJLbXdDTGVERURlaU1BSWlSQVBad1d2R1Y2RlFWNW14V2xGdm9SaGRDeTc2TW5kWXNNTQoza1Nwb1doMVBYUWpWYWZLV2lhZHJJS2FOSllDZkY2bzE5Ty9NdlZITGFFV0tnM0lzRGtvMGdtQWZ5VE8KTngzb2dYdTV0VFpvelRyUzRUMUpsMUR3bnRZbGlrMWhINkNYK0ZGLzIzVzlHaHdTdlcreVgzZFlTeHZjCjFuMlBjVDY5QzdDTmZtcWpOT293d20wcjl6M0lWYlZ2dGk4ZFduVzNEZDVGS256d2VaUDhaZ2hudUl4SQptUzdrY0ZWTVd4d3p6SmptQjg3UGZPbmZtZ2k2b0NxbFRzMXJDRldTQVZqM3hzenFFRGRnT1B1QXcvdzQKWmZOSS9sSVhHdU1DakpKQlYzNTZCN2ExNkZacXVqK2ZtOUQwS1BYbGpjSEcydHFRTjVDbHVTUnhUZlBiCm42U3ZOZ2tkVTNGM3pYS3NxRW9iRzdzakg5WjZWZlJIZjlRcmN2ZXZHdWFIb2ZZQkROVzZmT3ZNODBURQpHNjkzS3BRdytEaDVnMzBzamhXbDRuMS9aZUROR0RYZ0dERGRUMU9WQXRrVTBTcm1vY0ZSM1hCUHprYnQKRmw3YlVkVG1oVFlHVys2VmRIUG9mOFZ0b1FrWVJma2YxK1hFaC9kNUFvTzdSSVZRQ29qb3pqTmhoVy9qCjg4VW56d0VqZ3VoK0VMbVFRS1ViUi9ydjg2djcyM0VtVkVSd3hvQTIvalZCbGVaaHpFOHdrY01HODM3VApLVlo3N0VHblRPcTBjbUkrang2Ri9SenRjbDRBUHN6eEJkUkVSM25HR3dqbGVIdjdpMndhQTYzbWNJLzcKM0I0dWZyVGczbHNMWDVlWVFDUnJrdXdwOVZKNzNlWmJiOTlLOU51ZDhNVGczNnE0cFhtNWRBd3ZLZzEwCm96c0t2MHVxa0tDclF1TFBWU1JtZkE9PQo9Yll1VQotLS0tLUVORCBQR1AgTUVTU0FHRS0tLS0tCg=='
```

***
