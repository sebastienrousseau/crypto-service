#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0 OR MIT
#
# Publish every public workspace package to npm.
#
# Each package is packed with pnpm, which rewrites `workspace:*`
# dependencies to real versions, and the tarball is published with the
# npm CLI. npm (>= 11.5.1) authenticates through npm trusted publishing
# (GitHub OIDC) when the package has a trusted publisher configured on
# npmjs.com, and falls back to NODE_AUTH_TOKEN otherwise; pnpm 9's own
# publish does neither the OIDC exchange nor provenance reliably.
#
# Versions already on the registry are skipped, so a re-run after a
# partial failure publishes only what is missing.
#
# Usage: scripts/publish-npm.sh [--dry-run]
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

dry_run=()
if [[ "${1:-}" == "--dry-run" ]]; then
  dry_run=(--dry-run)
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

for dir in packages/crypto-*/; do
  read -r name version private < <(node -e '
    const p = require(process.argv[1]);
    console.log(p.name, p.version, Boolean(p.private));
  ' "$PWD/${dir}package.json")
  if [[ "$private" == "true" ]]; then
    continue
  fi
  if npm view "${name}@${version}" version >/dev/null 2>&1; then
    echo "publish-npm: ${name}@${version} already on npm, skipped"
    continue
  fi
  tarball="$(cd "$dir" && pnpm pack --pack-destination "$work" | tail -n 1)"
  npm publish "$tarball" --access public --provenance "${dry_run[@]}"
  echo "publish-npm: ${name}@${version} published${dry_run:+ (dry run)}"
done
