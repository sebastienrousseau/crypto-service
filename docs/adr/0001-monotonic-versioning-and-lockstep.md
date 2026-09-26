<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# ADR 0001: Monotonic Versioning and Monorepo Lockstep

## Status

Accepted

## Context

Crypto Service Suite is a monorepo consisting of 14 scoped npm packages spanning core cryptography primitives, a REST microservice, CLI, client SDK, and framework/database integrations.

Inconsistent versioning between core and satellite adapters leads to dependency skew, broken peer dependencies, and deployment confusion for consumers.

## Decision

1. **Monotonic SemVer Policy**: All releases increment strictly by `0.0.1` (`v0.0.1` → `v0.0.2` → `v0.0.3` ... → `v0.0.999` → `v0.1.0`). Milestone maturity `v0.1.0` requires progressing through `v0.0.999`.
2. **Lockstep Releases**: All 14 packages are versioned together and published in lockstep.
3. **Dedicated Release Branches**: Work for each iteration is performed on a dedicated branch named `feat/v<version>`.

## Consequences

- Predictable release lifecycle across all packages.
- Zero version skew between core primitives and framework adapters.
- Releases require all 14 packages to pass CI and compile cleanly before publish.
