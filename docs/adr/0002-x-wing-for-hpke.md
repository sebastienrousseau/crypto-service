<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# ADR 0002: X-Wing Is HPKE's Post-Quantum KEM

## Status

Accepted (0.0.36)

## Context

crypto-lib's HPKE offered an X25519 + ML-KEM-768 suite that put KEM ID
`0x0030` in its suite ID and derived its shared secret with
crypto-service's own combiner. IANA's HPKE registry assigns `0x0030` to
X25519Kyber768Draft00, a pre-standard Kyber construction with a 64-byte
shared secret. The suite therefore claimed to be something it was not,
and no other HPKE implementation could read its output.

The registry assigns `0x647A` to X-Wing (draft-connolly-cfrg-xwing-kem),
an X25519 + ML-KEM-768 KEM with published test vectors and a definition
for use in HPKE.

## Decision

1. HPKE offers `"x-wing"`: X-Wing as draft-connolly-cfrg-xwing-kem-06
   section 5.6 defines it for HPKE, on noble's `ml_kem768_x25519`. It is
   the default post-quantum suite of crypto-server, the CLI and the SDK.
2. Its tests run the draft's Appendix C vectors, extracted from the
   draft's text at a pinned SHA-256 by `scripts/xwing-vectors.mjs`, and
   recompute the RFC 9180 key schedule with suite ID `0x647A`.
3. `"x25519-ml-kem-768"` is deprecated and kept, so existing keys and
   messages still work. New code does not use it.

## Consequences

- HPKE output with X-Wing interoperates with other implementations of the
  registered KEM.
- X-Wing keys differ from the old suite's (a 32-byte seed as the private
  key; the ML-KEM key first in the public key), so recipients need new key
  pairs.
- The draft may change before it becomes an RFC; the pinned vectors show
  which revision this follows.
