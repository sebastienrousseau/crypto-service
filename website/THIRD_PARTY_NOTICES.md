<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Third-party notices (docs portal)

The docs portal at <https://docs.crypto-service.co> uses the same PRISM
design as <https://crypto-service.co>. The files below are vendored from
the site repository,
[crypto-service.github.io](https://github.com/sebastienrousseau/crypto-service.github.io),
at the commit recorded in `THEME.lock.json`, which also pins the SHA-256 of
each copy. Edit them in the site repository, then run
`node scripts/sync-site-theme.mjs --from <site-checkout>`;
`node scripts/sync-site-theme.mjs --check` (run by `make check` and CI)
fails if a copy here drifts.

`_layouts/css/prism.css`, `_layouts/js/prism.js`,
`_layouts/js/prism-theme-init.js` and the PRISM visual design are
MIT-licensed. They come unmodified from the PRISM theme as used by
[pain001.github.io](https://github.com/sebastienrousseau/pain001.github.io);
Crypto Service's own additions are `_layouts/css/crypto-service-prism.css`
and `_layouts/js/crypto-service-prism.js` (Apache-2.0 OR MIT).

`_layouts/fonts/inter-var-*.woff2` are subsets of Inter 4.1 (The Inter
Project Authors) and `_layouts/fonts/jetbrains-mono-var-*.woff2` are subsets
of JetBrains Mono (The JetBrains Mono Project Authors). Both are distributed
under the SIL Open Font License 1.1; the licence text is
`LICENSES/OFL-1.1.txt`.

`content/standards.md` is also owned by the site repository and vendored
unchanged, so both sites state the same standards coverage.
