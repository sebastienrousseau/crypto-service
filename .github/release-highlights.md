<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->
<!-- release: v0.0.38 -->
<!--
  The Highlights of the next release, written by hand: the release
  workflow refuses a tag whose marker above names another version, and
  composes the rest of the notes (What's Changed, Checksums, Full
  Changelog). Update this file in the commit that dates the release.
-->

## Highlights ⭐️

- **Releases publish in the house format**: the release workflow titles the release, writes its notes from these Highlights, GitHub's list of merged pull requests and the SHA-256 of every asset, and attaches the npm tarballs with a signed SLSA provenance bundle, so no release needs fixing by hand.
- **Migration guide catches up**: MIGRATION.md lists the 0.0.36 breaking changes it missed, three of them security fixes, and the breaking changes of 0.0.9.
