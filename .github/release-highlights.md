<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->
<!-- release: v0.0.38 -->
<!--
  The Highlights of the next release, written by hand: the release
  workflow refuses a tag whose marker above names another version, and
  composes the rest of the notes (What's Changed, Checksums, Full
  Changelog). Update this file in the commit that dates the release.
-->

## Highlights ⭐️

- **Signed provenance on the release page**: the 18 tarballs attached here come with a SLSA build provenance bundle, signed through Sigstore, so `gh attestation verify <tarball> --repo sebastienrousseau/crypto-service` checks a downloaded tarball. npm already carried provenance for every version.
- **Migration guide catches up**: MIGRATION.md now lists the five 0.0.36 breaking changes it missed, three of them security fixes (ORM legacy ciphertext, the 16-byte MAC key floor, PASETO expiry), and a new section covers the eleven breaking changes of 0.0.9.
- **Docs that match the code**: crypto-mcp's README lists all 23 of its tools instead of 15, the contribution guides ask for the pnpm version the repository pins, and tests now fail when the tool table or a source file's SPDX header drifts.
