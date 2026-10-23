<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# ADR 0003: Hybrid Signatures Are Composite ML-DSA

## Status

Accepted (0.0.36)

## Context

`hybridSign` had Ed25519 and ML-DSA each sign the raw message. Either half
was then an ordinary single-algorithm signature: it could be stripped
from the hybrid and presented alone, and nothing bound the two halves
together.

The IETF LAMPS working group's Composite ML-DSA
(draft-ietf-lamps-pq-composite-sigs, in the RFC Editor queue at revision 19) defines how both halves sign: each signs a message representative
`M' = Prefix || Label || len(ctx) || ctx || PH(M)`, and the ML-DSA half
uses the Label as its FIPS 204 context. It defines Ed25519 composites
with ML-DSA-44 and ML-DSA-65, and pairs ML-DSA-87 with Ed448.

## Decision

1. `hybridSign` and `hybridVerify` implement id-MLDSA44-Ed25519-SHA512 and
   id-MLDSA65-Ed25519-SHA512 from draft 19, with an optional application
   context, and `hybridSign` also returns the draft's serialized
   signature (ML-DSA signature, then Ed25519 signature).
2. ML-DSA-87 with Ed25519 is refused rather than given a label the draft
   does not define.
3. Signatures made before 0.0.36 verify only with `acceptLegacy`.
4. The draft's Appendix E vectors, extracted from its text at a pinned
   SHA-256 by `scripts/composite-sig-vectors.mjs`, are part of the tests.

## Consequences

- Neither half of a hybrid signature is a valid signature on its own.
- Keys and signatures are still passed as separate halves; the draft's
  composite key encodings (SPKI, PKCS#8) are not implemented yet.
