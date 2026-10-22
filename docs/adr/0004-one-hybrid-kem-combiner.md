<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# ADR 0004: One Combiner for crypto-service's Hybrid Constructions

## Status

Accepted (0.0.36)

## Context

The post-quantum sealed box, the multi-recipient envelope and the two
post-quantum streams each combined the X25519 and ML-KEM-768 shared
secrets in their own way, binding only the sender's ephemeral key: not
the recipient's public keys and not the ML-KEM ciphertext. crypto-lib's
`hybridKemEncapsulate` already had a combiner (v2) that binds both
ciphertexts and both public keys.

## Decision

1. Every crypto-service construction that combines X25519 and ML-KEM-768
   takes the v2 hybrid KEM secret and derives its key from it with
   HKDF and its own label, `crypto-service/<construction>/v2`
   (`sealed-box`, `multi-recipient`, `pq-stream`, `multi-pq-stream`).
2. Wire formats do not change. Decryption tries the v2 key, then the
   construction's earlier key, and the authentication tag decides, so
   outputs written before still decrypt. A test keeps outputs from the
   previous release and opens them.
3. Where a registered standard exists for the job, it is used instead of
   this combiner: X-Wing for HPKE (ADR 0002), and PQXDH's own KDF for
   PQXDH.

## Consequences

- One combiner to review, with its inputs bound.
- Outputs written now do not decrypt with releases before 0.0.36.
