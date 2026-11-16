<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# ADR 0005: Suite Lockstep Across Repositories

## Status

Accepted (0.0.40)

## Context

From 0.0.40 the Crypto Service suite spans eight repositories: this monorepo
(18 npm packages), six language SDKs (`crypto-service-sdk-{java,rust,go,cpp,dotnet,python}`)
and the site `crypto-service.github.io` (crypto-service.co). ADR 0001 keeps
the 18 packages in lockstep inside one repository, where one manifest check
enforces it. Across repositories nothing did: the site stayed at 0.0.24
while the packages reached 0.0.39.

The SDKs are thin clients over crypto-server's REST API. An SDK built
against one version of the API and released under another misleads its
users about what it supports.

## Decision

1. **One version for the suite.** Every member releases the same `0.0.x`
   version, moving strictly one step at a time (ADR 0001). The SDKs and the
   site join at 0.0.40.
2. **One inventory.** `docs/ecosystem.json` lists every member: its
   repository, registry identity, version file and required release
   assets. README tables, the site's SDK pages and the consistency check
   read it; nothing else hard-codes the member list.
3. **One contract.** `openapi/crypto-service.openapi.yaml` and
   `conformance/` in this repository are the API contract. Each SDK
   vendors the conformance kit byte-identical and records, in
   `ci/server.ref`, the crypto-service commit its conformance job runs
   against. A release pins that to the release tag's commit.
4. **Release order.** This repository is tagged first, then the six SDKs,
   then the site. Every tag is SSH-signed by the maintainer. This
   repository's release workflow dispatches `crypto-service-release` to
   the site, which regenerates and redeploys.
5. **Checked after release.** `scripts/check-ecosystem.mjs`, run by
   `.github/workflows/suite-consistency.yml` after a release, daily and on
   demand, verifies for every member: the tag, the GitHub release and its
   checksums, the registry publication, and the site's `VERSION`. Any drift
   fails the check.

## Consequences

- A suite release takes all eight repositories green. An SDK that cannot
  ship holds the version back for everyone; the alternative, members at
  different versions, is what this ADR removes.
- Adding a member means adding it to `docs/ecosystem.json`; the check then
  covers it.
- Releasing stays a maintainer action (signed tags, registry
  environments with required reviewers); automation verifies, it does not
  release on its own.
