#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0 OR MIT
#
# Stage every public workspace package for publishing on npm.
#
# Each package is packed with pnpm, which rewrites `workspace:*`
# dependencies to real versions, and the tarball is staged with
# `npm stage publish`. npm (>= 11.5.1) authenticates through npm trusted
# publishing (GitHub OIDC); every package's trusted publisher allows
# staging only, so nothing goes public until a maintainer approves each
# staged version with 2FA (`npm stage approve`, see DEVELOPMENT.md).
# pnpm 9's own publish does neither the OIDC exchange nor staging.
#
# Versions already published are skipped. A version that is already
# staged cannot be staged again, so every package is attempted and the
# script fails at the end, naming the packages that could not be staged.
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

failed=()
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
  if npm stage publish "$tarball" --access public --provenance "${dry_run[@]}"; then
    echo "publish-npm: ${name}@${version} staged${dry_run:+ (dry run)}"
  else
    failed+=("${name}@${version}")
  fi
done

if ((${#failed[@]} > 0)); then
  echo "publish-npm: could not stage: ${failed[*]}" >&2
  exit 1
fi
