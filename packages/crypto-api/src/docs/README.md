# 🔐 The Crypto Service Suite APIs

The Crypto Service Suite APIs are typical REST APIs that use HTTPS requests and responses for common cryptographic operations.

## Methods

## 🔒 Encryption API

Encrypts message text/data with public keys, passwords or both at once. At least either public keys or passwords must be specified. If private keys are specified, those will be used to sign the message.

### GET /encrypt

>```
>http://localhost:3000/v1/encrypt
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|
|passphrase|{{passphrase}}|(optional) - A passphrase to encrypt the message key. (min. 12 characters).|
|message|{{message}}|(required) message to be encrypted.|
|public-key|{{publicKey}}|(optional) array of keys or single key, used to encrypt the message.|

![divider][divider]

## 🔓 Decryption API

Provides the ability to decrypt an encrypted text with the specified key and algorithm. The API returns the decrypted text.

### GET /decrypt

>```
>http://localhost:3000/v1/decrypt
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|
|passphrase|{{passphrase}}|Passphrase to decrypt the message.|
|message|{{encMessage}}|Message to be decrypted.|
|public-key|{{publicKey}}|undefined|

![divider][divider]

## 🏛️ Key Generation API

Creates a key for cryptography using the specified algorithm. The key created using this API is used for encrypting clear text and decrypting the encrypted data.

Supports RSA and ECC keys. By default, primary and sub keys will be of same type. The generated primary key will have signing capabilities. By default, one sub key with encryption capabilities is also generated.

### GET /generate

>```
>http://localhost:3000/v1/generate
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

![divider][divider]

## 👟 Health Check API

The Health Check API is a RESTful web service that uses HTTPS as a transport and JSON as a message serialisation format.

This collection checks the status of he 🔐 The Crypto Service Suite API endpoints.

### GET /health

>```
>http://localhost:3000/health
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|

![divider][divider]

## ❌ Revocation API

Provides the ability to decrypt an encrypted text with the specified key and algorithm. The API returns the decrypted text.

### GET /revoke

>```
>http://localhost:3000/v1/revoke
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
>http://localhost:3000/v1/verify
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