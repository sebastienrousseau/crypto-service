<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Choosing an algorithm

crypto-lib offers more algorithms than most applications need. This page
says which to use for each job, and why. It gives advice; the status of
each algorithm (recommended, acceptable, deprecated) comes from the
registry, which `recommended()`, `isDeprecated()` and crypto-server's
`GET /v2/algorithms` read. Where this page and the registry disagree, the
registry is right and this page is a bug.

Two defaults run through it:

- **Post-quantum by default for anything that must stay secret or
  authentic for years.** Data encrypted today can be recorded now and
  decrypted later, so key exchange and public-key encryption should be
  hybrid (X25519 with ML-KEM) now. Signatures can follow the same path.
- **Hybrid, not post-quantum alone,** while ML-KEM and ML-DSA are young:
  a hybrid stays secure if either half holds.

## Encrypting with a key you already share

| Need                                       | Use                                                    |
| ------------------------------------------ | ------------------------------------------------------ |
| A message or value                         | `secretbox.seal` (XChaCha20-Poly1305, random nonce)    |
| Large data, or data that arrives in pieces | `createEncryptStream` (Web Streams) or `streamEncrypt` |
| AES required (hardware, FIPS boundary)     | `aesGcmEncrypt` with a random nonce per message        |
| Nonces that might repeat                   | `aesGcmSivEncrypt` (misuse resistant)                  |

XChaCha20-Poly1305's 24-byte nonce can be random for any number of
messages. AES-GCM's 12-byte nonce cannot: past about 2^32 messages under
one key, random nonces risk repeating, and a repeat reveals the
authentication key. Rotate AES-GCM keys long before that, or use
AES-GCM-SIV.

The streaming functions split data into chunks, authenticate each, and
mark the last one, so a reader can emit plaintext as it arrives and still
detect truncation. Treat streamed output as complete only once the
stream ends without an error.

## Encrypting to someone's public key

| Need                                      | Use                                                         |
| ----------------------------------------- | ----------------------------------------------------------- |
| Interoperable, standard format            | `hpkeSeal` with the `x-wing` KEM (HPKE, RFC 9180)           |
| One recipient, crypto-service format      | `sealedbox.sealPQ` (X25519 + ML-KEM-768)                    |
| Several recipients, one ciphertext        | `multiEncrypt` with `x25519-ml-kem-768` recipients          |
| Large data to one or several recipients   | `createPqEncryptStream` or `createMultiPqEncryptStream`     |
| A shared secret for your own protocol     | `hybridKemEncapsulate` (X25519 + ML-KEM, binds both inputs) |
| Asynchronous messaging (prekeys, offline) | `protocols.pqxdh`, then `protocols.ratchet`                 |

X-Wing is the X25519 + ML-KEM-768 KEM registered for HPKE (KEM
`0x647A`); other HPKE implementations can read what `hpkeSeal` writes with
it. HPKE with X25519 alone (`x25519`) is classical: use it only to talk
to a peer that has nothing else.

## Signing

| Need                                         | Use                                               |
| -------------------------------------------- | ------------------------------------------------- |
| New system, long-lived signatures            | `hybridSign` (Composite ML-DSA-65 + Ed25519)      |
| Post-quantum only                            | `mlDsaSign` with ML-DSA-65                        |
| Most conservative assumptions, size no issue | `slhDsaSign` (hash-based; large, slow signatures) |
| Classical, compact, widely supported         | `ed25519Sign`                                     |
| WebCrypto, X.509 or a JWS peer that needs it | `p256Sign` (ECDSA P-256)                          |
| Signed tokens                                | `tokens.v4public` (PASETO v4.public, Ed25519)     |

`hybridSign` follows the IETF Composite ML-DSA draft: both halves sign a
message representative that names the composite, so neither half is a
valid signature on its own. FN-DSA (`fnDsaSign`) has no status in the
registry; prefer ML-DSA.

## Passwords, keys from secrets, and MACs

| Need                                        | Use                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------- |
| Store a password                            | `hashPassword` (Argon2id, t=3, m=64 MiB, p=4 by default)              |
| Encrypt with a password                     | `passwordEncrypt`                                                     |
| Derive keys from a high-entropy secret      | `kdfDerive` with HKDF-SHA256                                          |
| Authenticate a message with a shared secret | `computeHmac` with HMAC-SHA256 and a 32-byte random key (16 at least) |
| Encrypted tokens                            | `tokens.v4local` (PASETO v4.local)                                    |

HKDF is for keys that are already random (a DH output, a master key). A
password is not: it needs Argon2id's cost. PBKDF2 is deprecated in the
registry and offered only where a standard requires it.

## What to avoid

- Anything `isDeprecated()` reports, unless you are reading old data.
- Functions documented as deprecated aliases (`@deprecated` in the API
  docs); each names its replacement.
- Classical-only key exchange or public-key encryption for data that
  must stay confidential for years.
- Building your own combination of primitives when a row above covers
  the job: each of those constructions binds its inputs and is tested
  against published vectors where they exist.
