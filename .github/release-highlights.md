<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->
<!-- release: v0.0.40 -->
<!--
  The Highlights of the next release, written by hand: the release
  workflow refuses a tag whose marker above names another version, and
  composes the rest of the notes (What's Changed, Checksums, Full
  Changelog). Update this file in the commit that dates the release.
-->

## Highlights ⭐️

- **One version across the suite**: from 0.0.40 the six language SDKs (Java, Rust, Go, C++, .NET, Python) and crypto-service.co release the same version as the 18 packages, and a daily Suite consistency check opens an issue when a tag, release, registry or the site drifts.
- **An API contract for every language**: a committed OpenAPI 3.1 document, generated from the server's route schemas and gated against drift, now declares the response body, problem types and required scopes of every route, and a conformance kit of 119 request/response vectors lets SDKs in other languages prove they agree.
- **Clearer errors from crypto-server**: a wrong AEAD key now answers `400 invalid-input` instead of `500`, keys from `/v2/keys/generate` work with the post-quantum routes, and Feldman share verification throws `INVALID_HEX` on every runtime.
- **Docs on the shared PRISM design**: docs.crypto-service.co now looks and navigates like crypto-service.co, and its standards page no longer understates coverage or dependencies.
