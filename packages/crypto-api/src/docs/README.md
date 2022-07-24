# 🔐 The Crypto Service Suite APIs

The Crypto Service Suite APIs are typical REST APIs that use HTTPS requests and responses for common cryptographic operations.

## Methods

## 🔒 Encryption API

Encrypts message text/data with public keys, passwords or both at once. At least either public keys or passwords must be specified. If private keys are specified, those will be used to sign the message.

#### Returns

Encrypted message (string if `armor` was true, the default; Uint8Array if `armor` was false).

#### Type

Promise.<(MaybeStream.|MaybeStream.)>

### GET /encrypt

>```
>http://localhost:3000/v1/encrypt
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|
|passphrase|{{passphrase}}|(required) - A passphrase to encrypt the message key. (min. 12 characters).|
|message|{{message}}|(required) message to be encrypted.|
|public-key|{{publicKey}}|(required) array of keys or single key, used to encrypt the message.|
### Response

|Code|Status|
|---|---|
|200|OK|
|500|Internal Server Error|

#### Example response

```json
{
    "data": "Encrypted message (string if armor was true, the default; Uint8Array if armor was false)."
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

#### Type

Promise.<(Object)>

### GET /decrypt

>```
>http://localhost:3000/v1/decrypt
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

#### Returns

The generated key object in the form: { privateKey:PrivateKey|Uint8Array|String, publicKey:PublicKey|Uint8Array|String, revocationCertificate:String }.

#### Type

Promise.<(Object)>

### GET /generate

>```
>http://localhost:3000/v1/generate
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|
|name|{{name}}|(optional) String consisting of a First name and Last name. e.g. ‘Jane Doe’|
|email|{{email}}|(optional) An email address. e.g. 'jane@doe.com'|
|type|{{type}}|(required) The primary key algorithm type: 'ecc' | 'rsa'. Default: 'ecc'.|
|passphrase|{{passphrase}}|(optional) A passphrase to encrypt the resulting private key. (min. 12 characters).|
|rsaBits|{{rsaBits}}|(optional) Number of bits for RSA keys: 2048 or 4096. Defaults to 2048.|
|curve|{{curve}}|(optional) elliptic curve for ECC keys: curve25519, p256, p384, p521, secp256k1, brainpoolP256r1, brainpoolP384r1, or brainpoolP512r1.|
|keyExpirationTime|{{keyExpirationTime}}|(optional) Number of seconds from the key creation time after which the key expires.|
|format|{{format}}|(optional) Format of the output keys e.g. 'armored' | 'object' | 'binary'.|
### Response

|Code|Status|
|---|---|
|200|OK|
|500|Internal Server Error|

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
>http://localhost:3000/health
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|
### Response

|Code|Status|
|---|---|
|200|OK|
|404|Not Found|

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

Revokes a key. Requires either a private key or a revocation certificate. If a revocation certificate is passed, the reasonForRevocation parameter will be ignored.

#### Returns

The revoked key in the form: { privateKey:PrivateKey|Uint8Array|String, publicKey:PublicKey|Uint8Array|String } if private key is passed, or { privateKey: null, publicKey:PublicKey|Uint8Array|String } otherwise.

#### Type

Promise.<(Object)>

### GET /revoke

>```
>http://localhost:3000/v1/revoke
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|
|passphrase|{{passphrase}}|(required) - A passphrase to encrypt the message key. (min. 12 characters).|
### Response

|Code|Status|
|---|---|
|200|OK|
|500|Internal Server Error|

#### Example response

```json
{
    "data": {
        "privateKey": "PGP PRIVATE KEY BLOCK",
        "publicKey": "PGP PUBLIC KEY BLOCK"
    }
}
```


![divider][divider]

## 🔏 Signature Verification API

Verifies signatures for cleartext signed message.

#### Returns

Object containing verified message in the form:

``` json
{
  data: MaybeStream, (if `message` was a CleartextMessage)
  data: MaybeStream, (if `message` was a Message)
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

#### Type

Promise.<(Object)>

### GET /verify

>```
>http://localhost:3000/v1/verify
>```

### Request Headers

|Parameter|Value|Description|
|---|---|---|
|message|{{message}}|(required) message to be verified.|
|passphrase|{{passphrase}}|(optional) passphrase to encrypt the message key. (min. 12 characters).|
|verification-keys|{{verificationKeys}}|(required) array of publicKeys or single key, to verify signatures.|
|date|{{date}}|(optional) use the given date for verification instead of the current time.|
### Response

|Code|Status|
|---|---|
|200|OK|
|500|Internal Server Error|

#### Example response

```json
{
    "data": {
        "signatures": "The detached signature or an empty signature for unsigned messages (Signature)",
        "data": "The cleartext of the signed message (String)"
    }
}
```


![divider][divider]


[divider]: https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/divider.svg