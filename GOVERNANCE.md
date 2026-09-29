<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Governance

This document outlines the governance model and project management practices for Crypto Service Suite.

## Maintainer Model

Crypto Service Suite is currently maintained by Sebastien Rousseau (`@sebastienrousseau`).

## Decision Making

- Architecture decisions, major breaking changes, and cryptographic algorithm selection are evaluated through Architecture Decision Records (ADRs) located in `docs/adr/`.
- Pull requests undergo automated continuous integration checks. All verification gates (build, lint, formatting, tests at 100% coverage, TypeDoc generation) must be green prior to merge.
- Merges to `main` and release tags require explicit maintainer authorization.

## Release Process

- Releases follow the monotonic Semantic Versioning Lifecycle rule (`v0.0.1` → `v0.0.2` → `v0.0.3` ... → `v0.0.999` → `v0.1.0`).
- All 18 packages in the monorepo publish in coordinated lockstep.
- Releases and tags are cryptographically signed.
