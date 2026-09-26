<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Toolchain and Ecosystem Policies

## Node.js Support Policy

Node.js **>= 22.0.0** is the supported minimum floor. CI continuously tests against active Node.js LTS releases (currently Node.js 22 and 24) across macOS, Linux, and Windows runners.

The minimum Node.js floor may only be raised:

1. After the targeted Node.js release reaches official upstream End-of-Life (EOL).
2. Announced at least one release in advance.
3. Formally recorded as a breaking change in the release notes.

## Monorepo Lockstep Policy

All 14 packages within the Crypto Service workspace move in lockstep at identical version numbers. Every release increments strictly by +0.0.1 on the `v0.0.x` line until reaching `v0.0.999`.

## Dependency Management

- Dependencies are managed using `pnpm` with committed `pnpm-lock.yaml`.
- Automated security scanning via Dependabot and CodeQL monitors supply-chain integrity.
- Audited cryptographic engines (`@noble/*`, native Node.js `crypto`, `openpgp`) are strictly versioned.
