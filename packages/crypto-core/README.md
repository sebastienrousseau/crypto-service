![Banner representing Crypto Core](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/crypto-core-logo.svg)

[![Maintained with Lerna](https://img.shields.io/badge/maintained%20with-lerna-blue?style=for-the-badge)](https://lerna.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge&logo=)](https://opensource.org/licenses/MIT)
![Made with Love](/assets/made-with-love.svg)

***

# Introduction

Crypto Service is a powerful and intuitive suite of services that provides a
set of cryptographic functions and standardized APIs to manage encryption keys
and perform cryptographic operations such as key generation, data encryption,
digital signing, and signature verification. Crypto Service code is safe by
design, and runs lightning-fast.

Crypto Service is based on [OpenPGP.js](https://openpgpjs.org/) - a
JavaScript implementation of the OpenPGP protocol. It implements
[RFC4880](https://tools.ietf.org/html/rfc4880) and parts of
[RFC4880bis](https://tools.ietf.org/html/draft-ietf-openpgp-rfc4880bis-10).

Crypto Service can help you ensure the following:

- Authentication of communicating parties,
- Integrity of data,
- Message Level Encryption for encryption and non-repudiation.,
- Privacy of data.

## Installation

To install Crypto Service, use either `npm` or `yarn` to use the application
with NodeJS or the Command Line Interface.

- `npm i @sebastienrousseau/crypto-service`
- `yarn add @sebastienrousseau/crypto-service`

## Usage

### Command line interface

#### Generate a new RSA key pair

[RSA](https://en.wikipedia.org/wiki/RSA_\(cryptosystem\)) is a public-key
algorithm for encrypting and signing messages.

To generate a Rivest-Shamir-Adelman (RSA) public key pair:

- Open Terminal for Mac or Command Prompt for Windows,
- Enter the following example command that will start the generation process.

```shell
yarn start --curve "" --email "jane@doe.com" --expiration 0 --format armored --name "Jane Doe" --passphrase 123456789abcdef --sign true --bits 4096 --type rsa
```

This starts generating a 2048-bit RSA key pair, encrypts them with the password
provided and writes them to a file in the [key](src/key/) directory with a pgp
extension.

***

#### Generate a new Elliptic-curve cryptography (ECC) key pair

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

```shell
yarn start --curve curve25519 --email "jane@doe.com" --expiration 0 --format armored --name "Jane Doe" --passphrase 123456789abcdef --sign true --bits null --type ecc
```

This starts generating an Elliptic Curve Cryptography (ECC) key pair, encrypts
them with the password provided and writes them to a file in the
[key](src/key/) directory with a pgp extension.

***

#### Encrypt Data

Encryption is the transformation of data into a form in which it cannot be made
sense of without the use of some key. Such transformed data is referred to as
`ciphertext`.

To encrypt a message:

- Open Terminal for Mac or Command Prompt for Windows,
- Run the yarn start
- Enter the following example command that will start the encryption process.

```shell
node src/lib/encrypt.js --passphrase '123456789abcdef' --message 'Hello Crypto Service APIs!'
```

***

#### Decrypt Data

Decryption restores encrypted data to to its original (cleartext or plaintext)
form.

To decrypt a message:

- Open Terminal for Mac or Command Prompt for Windows,
- Enter the following example command that will start the decryption process.

```shell
node src/lib/decrypt.js --passphrase '123456789abcdef' --message 'LS0tLS1CRUdJTiBQR1AgTUVTU0FHRS0tLS0tCgp3Y0JNQTExMHlyM0drdWx5QVFmOENmbnVZZFk2RmliY1Q1Z094SjVFY2dUME50ZGt6K2dQT0tKTkVoRngKV3dzSHJoM08rTWlrcnBUOElyTjFkbDEwcUpCeDZkVXNkK3dtZ0twdFJrdElVSm5weVZ1Z3RJQkE5MEdBClgxNWdHNFZRQkl0cHUyYmdNRnlKRnJtSS85UUtlNHpDZkV0dSs5SjU0VkRLNWNRRk5KakxPSC9LaklIaAppU2NqQmFvbFlHN1p6Vyt5OXVxTEVkZytYSW9qYXVER3dyRHdIdVFvT0k2NGRmNnJWQVhiZi9mL01iajUKSXdqdmE2UGI2QXZ3YXhjRlczQjFWcHhYajY0a3kzZ2Rxd0FpOXFOUkVmMjE3SU43RHpCMTJzcDRLZlozCkZ4NTdwUk5lekY0VTZPdis5WWU0SkJRMnR4UG5sNmlnUXBDNmpRR2lXWUpHMGJJQ3lIN2NUSDRwZGN2VwphTkxBMEFIU3dpZEQzRnZJRWpxSnRmMlJlZzVLMmtSbHpFNWFCRXlaayt5a3VvZ2pYV0dkWkYxb20yV2gKM3kwTE9Kb2RYOUJNYW9zYlpSN24za2JOb0dXRkRCTElpYnRLUmdvNmlwdGs1b3Iyd0lwWC9wM1ovaWtJCkZieDhpVnpqWHViQ2xZSzhrZlB3Zm5uVFRRSmsxV1VsWTBDZm9YRURMY1ZIbG9rMy9ReHB2TmphWEg2NwpsU1hmSmtxdDNXdVJ6K0xIM3p0ald3THlpeHpmNXRPNUhsTnhudjlKUkVPR0pqendsL3liUi8xLzR2TkMKeDJ1WmdmQTBHSXZqNHBDRnBNRTI3ODhLaTdRckxtemVrUUtRQzBsMFl3aU9abXZueUNmdDliNG9yMDFmCjd2WU8xQzV5dExGZTBVUnpPQktnZGxjajRSU2sxWnJKc3RNTS9qSVNQR2lnZjBOWFp5c2NyQTVnZ0pzcwpOZ0JLd1Q2M3dzQ3MyV0lxcS9QZ2ZCUTRjOUl4eXNydDM1Skgra0E3c2hIQ0s0Rk1RcVRTa2d1VWcyQVcKL0c4a3lDcnRXR1RIMFpsNjBNNmJLUmhpdEMxS0Y3R29hcW5sUDFoNmFydXZXUUM4eTRtY2dtellNR2FjCkxEZzNlMGVLRWVVTEVockdXY3ViZWlDeVJlU0tybWhwTmN5ODFucURDZkVsVUg0UVd6eEFlMmVNZTljPQo9UEs4dAotLS0tLUVORCBQR1AgTUVTU0FHRS0tLS0tCg=='
```

***

## API

### Encrypt Data via API

To encrypt a message:

- Open Terminal for Mac or Command Prompt for Windows,
- Enter the following example command that will start the encryption process.

```shell

curl --location --request GET 'http://localhost:3000/encrypt' \
--header 'passphrase: 123456789abcdef' \
--header 'message: Hello Crypto Service!'

```

### Decrypt Data via API

To decrypt a message:

- Open Terminal for Mac or Command Prompt for Windows,
- Enter the following example command that will start the encryption process.

```shell

curl --location --request GET 'http://localhost:3000/decrypt' \
--header 'passphrase: 123456789abcdef' \
--header 'message: LS0tLS1CRUdJTiBQR1AgTUVTU0FHRS0tLS0tCgp3Y0ZNQXpMNWFTdVU0RWM4QVJBQWtnUUVEMVNwaTN5MmRrME1kbHQwYmtsMEdIWEoxbytxZHdzeWxZdlIKcjVycGVydXVmeWd3V0JTR1p6UHNSMG51MFg4SWxIQ0hYR2pha0N2WFVhMEZHTFNHR2pqRHdZQmViZjAvCitIVE51K1BMYzRvVmlvMXAwZEZraFFuOVVHSG82b1NVQmNqcmdsWTlsTW4ySzg3RVp2M1BUZ2k3aGtiMwpOWVhFazl5dWdLalVGU1RtMERDdGdpNkt2YUpycURpZStLbnJxSVNrckpxS0I0T1FuOUlNQk1UY3kxVEgKQld2QStyQ2llSFBNRHIrNFRwbTU5cFgxQUhCb0xPRm9WK1c1YlJoNEY5VHVxNzRaMW9pV2cyUFFEM252CjFtdnlZN1VIdEVuczBFbzYvWFRTQnZzNndQdFBJT2FoWGlTSC9UYmNod1RNTjlBZ1NSa3YzeEpWcGhjSgpPaGRGaFNMQ1dSUlR5UGxlUWpNeEoyemwwRm1JM2IrZnNYUkZlKzRCRjhiQjl6MUV4Nk9KOE1raG9yOFYKN3B5ZHR2UUVBVFlXMHVEc3pNb09UNHhqYnUvL29ESk45dnRINnBTY1hnQ3o2MGI4TTdHaXl6VGFoV3FLCmsvSklVWHJORjB2cjk3RWVnRGs3VXNFV3Y4MFhYdkg3dEtVTFNQcnRSTmxnbytqSjk5SzBmcm9iK1QxQwpIcVp4UzdpZCsxaTJOOHhQcUZnd2lDeHhXS1dMTGllQW1GRVVuQ3NXYUR0b05OZUhYbkJyLzk5b25PZGoKd0pWT0krQS9uZlU5bXh2ZGFnWlNqWnlMQ0ZDa1REQ05GeWxKL0dmUnZIWndBNGsya0ZqZXUvQWhQa0Y5Ck1EQktZdmNSWFJudklLOW5STHhIYjZKMUpoS3ppbnFpbHgrZmpQak9kdVRTd2NzQnlicThXenRPbmpscwp3WkZZVU9uQjdsQ0N4d3lxc3hqNlBQdkpLODFTOTBhaElQMkNUVVVsWWlMWTRSa05qRjlwNnArSXZoVW4KeFB3UXFwSU03V2ZpckZOM0tJT3QrOWpyazE3YStFVWtOelBuNm5jMHdobTUzWDFtaWhHOEJPYXc5UFgwCmlSWHZuTTlEL0dkWHI4ZTNhWDFRTnBXOVVlKzZ5c1NqZi85bEs5MVo5aTl4eUpmSW51eS9EdXpjSGtYawpTa1Z5VjRablE3MCsrY0JvN1JaYUkzZ3Zuak9HYkF2Z3dVakJIYUoyL0Vqd0oyd1FESm9lbkVYdUFEeTcKOHhLRWk2V2p3V1lBUXVlUmh1cGdhYmJIcVFGazltTWhHSGcvMlpkNkViMTYyTmVYeTU2RkYrK1lWSm5jCnJrSVN5bkFmdWJSc1hmZXUxYS9TWWJvR2h0cTNheWQ3VTM3YVpCUmtuclFieldxYituV2YvRk54YkRvRAprTkpsV1BDSHZBeHhNRTd3U2gxRkZQNmtCL24yVWxTV1JNUWZwY25hbzFFUW9QUGdQcWtDcm9vSXh4WVMKWEsySlEzOWtucmpmY053bEJZYlVkZnlNaVlSRi84cHJxT25YU242czJDTUN6WjAzamlNeEpYYmFDS0N6CnNqVXpmMDVMTnJ5V01nR0dmQWFRcWZhN3NYM3NtL3VjL09IV25paFpVaWsrVlZQbzNPVGE1NG0vRnd2YgpjQmxseFV6UHVYSzg3NG1lQVNPanRZc2luOUQzVnNIWVdHa0g5azJ6eFgyZEU1cTZUeGxUaU9FOWx0UHUKRWxmWXloU1dtMXJYVUxDZmprYkE2TjlSSEFMR0VNU0Uwa3p1QXpGZmh0OFlpVkhxcHZULytrWjF1azA3ClZLejhnS09UQllMNG84ZWt6V2ZJZ2N3MThkcmZ4SThIUHQ1cUtEZzJpUUM3M1BBS1gxaEJxVHp4LzJSbAptS2FBeFZ5NW1yanVwWmV3RnpMc2tiYlRhYWszd0Y2eHZVWktFNmFHdFRFcnZIVWJlL0xoL00zajVBQTQKUGRZQSs3djZMd3BTcGRVYTRQK2xKb0d0SVQremRQTXF2TE1Od3lyYk9nSWVveEZXZHNxQk9qM1kwNk0xCmhJUk9IamRnVG9yUUhvOD0KPTh4MUMKLS0tLS1FTkQgUEdQIE1FU1NBR0UtLS0tLQo='

```

Made with ❤ in London.
