# 🔐 The Crypto Service Suite APIs

The Crypto Service Suite APIs are typical REST APIs that use HTTPS requests and responses for common cryptographic operations.

## Methods

## 🔒 Encryption API

Encrypts message text/data with public keys, passwords or both at once. At least either public keys or passwords must be specified. If private keys are specified, those will be used to sign the message.

### GET /encrypt

>```
>undefined
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|
|passphrase|{{passphrase}}|(optional) - A passphrase to encrypt the message key. (min. 12 characters).|
|message|{{message}}|(required) message to be encrypted.|
|public-key|{{publicKey}}|(optional) array of keys or single key, used to encrypt the message.|
### Response

|Code|Status|
|---|---|
|200|OK|

#### Example response

```json
{
    "data": "-----BEGIN PGP MESSAGE-----\n\nwcBMA1gs7khYahHvAQf/cPMwCrLY0vMqbG+PyJtOWmXLVcA91j/ZeX3/Dd+f\nfLFuRUmoOQSg0z5HRTj0sGxcvWylyLGsgrOT1zDinI2MUwkUtf6Eo/U46rIB\n0AusH9uvLeJFb7q65MYYXYp5/sgEbX0FPaJgY5RoSsajeZpipx/ppokFD/s1\n8vfF8ez5aDJKf2I8hxsekPYKjYgFq3TNc0xEfAg6ofPp7axfqXTRtO2KOz2l\ndhR0FDBOjEcY9f2da/fuwYtTgwOsFfTHpgfaLtNoDQKkWlXxQcY8vVD4k9jG\nOcPp+6vNUlmTdLm33cHN4UAVS5ZV1At742hA0ZosiotaIobNug1Uz1Dz+q/t\nc9LA0AEBc0eH8YkdaR+20pn1uuDsVC8dgkLy9GW6HbIV9iLS09TaVgqZYA7E\ncqe+8BfeDjzkqzg+0+jBQQq0bVc24OfzLBMI/hVPNyTQ1tZGNKJnI/o+3M4o\nkJ3yR6ePdpbV71JX71vblIg25MqwwG6YQUjbc5DCiZcxp5OWvfzVcfOu2531\nRbCVG6JWDYnP3kMKSO2Ew49rN+YkTT9ehuRb89oF+/FWDpRwcmgFlFlYwZ/G\ns89zQOx2dzBK+8pR1uINUPkGGUQfgCz1oj1DvDwFgoOTwOcw4ZnlGN6Uvs7L\nA5TTJJFo2vcYJCNMvwBassavK1whnzvxlGdBkdtA8dNsv73+MvDEXjg2aOZe\nLDujXYiYHb1fpU7qBYnBwjWNBJyScaA7Yr7Plht8eDCvte4vh/Vlx+WZchyD\nr3BAyCpzgESHViKpL8WBfMew/M6L0J8k1NmPzdv2TNfrQ1Xl8b55ec4ejFkq\nlZXTQUtdFQAqLtryMLRmpGDA+7nWO+de9w95R2fl50G9XtHzEq8fbPyorB4=\n=os+S\n-----END PGP MESSAGE-----\n"
}
```


![divider][divider]

## 🔓 Decryption API

Provides the ability to decrypt an encrypted message with the user's private key, a session key or a password. The API returns the decrypted text.

#### Returns

Object containing decrypted and verified message in the form:

``` json
{
  data: MaybeStream, (if format was 'utf8', the default)
  data: MaybeStream, (if format was 'binary')
  filename: String,
  signatures: [
    {
      keyID: module:type/keyid~KeyID,
      verified: Promise,
      signature: Promise
    }, ...
  ]
}

```

where `signatures` contains a separate entry for each signature packet found in the input message.

### GET /decrypt

>```
>undefined
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|
|passphrase|{{passphrase}}|(required) passphrase to decrypt the message.|
|message|{{encMessage}}|(required) message object with the encrypted data.|
|public-key|{{publicKey}}|(required) array of public keys or single key, to verify signatures.|
### Response

|Code|Status|
|---|---|
|200|OK|
|500|Internal Server Error|

#### Example response

```json

```


![divider][divider]

## 🏛️ Key Generation API

Creates a key for cryptography using the specified algorithm. The key created using this API is used for encrypting clear text and decrypting the encrypted data.

Supports RSA and ECC keys. By default, primary and sub keys will be of same type. The generated primary key will have signing capabilities. By default, one sub key with encryption capabilities is also generated.

### GET /generate

>```
>undefined
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|
|name|{{name}}|(required) String consisting of a First name and Last name. e.g. ‘Jane Doe’|
|email|{{email}}|(required) An email address. e.g. 'jane@doe.com'|
|type|{{type}}|(optional) The primary key algorithm type: 'ecc' | 'rsa'. Default: 'ecc'.|
|passphrase|{{passphrase}}|(optional) A passphrase to encrypt the resulting private key. (min. 12 characters).|
|rsaBits|{{rsaBits}}|(optional) Number of bits for RSA keys: 2048 or 4096. Defaults to 2048.|
|curve|{{curve}}|(optional) elliptic curve for ECC keys: curve25519, p256, p384, p521, secp256k1, brainpoolP256r1, brainpoolP384r1, or brainpoolP512r1.|
|keyExpirationTime|{{keyExpirationTime}}|(optional) Number of seconds from the key creation time after which the key expires.|
|format|{{format}}|(optional) Format of the output keys e.g. 'armored' | 'object' | 'binary'.|
### Response

|Code|Status|
|---|---|
|200|OK|

#### Example response

```json
{
    "data": {
        "publicKey": "PGP PUBLIC KEY BLOCK",
        "privateKey": "PGP PRIVATE KEY BLOCK",
        "revocationCertificate": "PGP REVOCATION CERTIFICATE BLOCK"
    }
}
```


![divider][divider]

## 👟 Health Check API

The Health Check API is a RESTful web service that uses HTTPS as a transport and JSON as a message serialisation format.

This collection checks the status of he 🔐 The Crypto Service Suite API endpoints.

### GET /health

>```
>undefined
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|
### Response

|Code|Status|
|---|---|
|200|OK|

#### Example response

```json
{
    "statusCode": 200,
    "status": "ok",
    "uptime": 4707.284612625
}
```


![divider][divider]

## ❌ Revocation API

Provides the ability to decrypt an encrypted text with the specified key and algorithm. The API returns the decrypted text.

### GET /revoke

>```
>undefined
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|
|passphrase|{{passphrase}}|(optional) - A passphrase to encrypt the message key. (min. 12 characters).|

![divider][divider]

## 🔏 Signature Verification API

Verifies signatures for cleartext signed message.

### GET /verify

>```
>undefined
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|
|message|{{message}}|(required) message to be verified.|
|passphrase|{{passphrase}}|(required) - A passphrase to encrypt the message key. (min. 12 characters).|
|verification-keys|{{verificationKeys}}|(required) array of publicKeys or single key, to verify signatures.|
|date|{{date}}|undefined|

![divider][divider]


[divider]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/divider.svg