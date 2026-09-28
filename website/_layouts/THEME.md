<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Vendored Theme: Voxt

These layouts and assets are adapted from the **Voxt** single-page developer and AI showcase theme in
`ssg-themes.github.io` (`themes/voxt`), licensed Apache-2.0 OR MIT.

They are vendored locally so that the documentation site build has no network dependency on another repository and can be compiled deterministically using the local `ssg` compiler (`cargo-ssg`).

## Upstream Reference

- Repository: <https://github.com/sebastienrousseau/ssg-themes.github.io>
- Theme Path: `themes/voxt`
- Local Path: `/Users/seb/Code/Public/Web/ssg-themes.github.io/themes/voxt/`

## Compilation

Compile the site using local `ssg`:

```sh
ssg build -f website/ssg.toml
```

Or via the unified monorepo script:

```sh
pnpm run docs:portal
```
