<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->
<!-- release: v0.0.39 -->
<!--
  The Highlights of the next release, written by hand: the release
  workflow refuses a tag whose marker above names another version, and
  composes the rest of the notes (What's Changed, Checksums, Full
  Changelog). Update this file in the commit that dates the release.
-->

## Highlights ⭐️

- **Release notes start at the Highlights**: the v0.0.38 notes opened with five stray lines, the body of a comment in the file the Highlights come from. The release workflow now removes every HTML comment from that file, however many lines it spans; the v0.0.38 release page was corrected by hand.
- **A broken Highlights file stops the release early**: a comment that is never closed now fails the build job's preflight, before anything is attached to a release or published to npm.
- **All 18 packages at 0.0.39**: no API changes in any package; this release carries the release-notes fix above.
