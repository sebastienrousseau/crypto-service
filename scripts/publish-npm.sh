#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0 OR MIT
#
# Publish the tarballs made by scripts/pack-npm.sh to npm.
#
# npm (>= 11.5.1) authenticates through npm trusted publishing (GitHub
# OIDC) and attaches provenance. Each package's trusted publisher only
# accepts the release workflow's `npm` environment, which GitHub holds
# until a maintainer approves the run, so nothing is published without
# that approval. pnpm 9's own publish does not do the OIDC exchange.
#
# Versions already on npm are skipped, so a re-run after a partial
# failure publishes only what is missing. Every tarball is attempted and
# the script fails at the end, naming any that could not be published.
#
# Usage: scripts/publish-npm.sh <tarball-dir> [--dry-run]
set -euo pipefail

dir="${1:?usage: scripts/publish-npm.sh <tarball-dir> [--dry-run]}"
dry_run=()
if [[ "${2:-}" == "--dry-run" ]]; then
  dry_run=(--dry-run)
fi

shopt -s nullglob
tarballs=("$dir"/*.tgz)
if ((${#tarballs[@]} == 0)); then
  echo "publish-npm: no tarballs in $dir" >&2
  exit 1
fi

failed=()
for tarball in "${tarballs[@]}"; do
  read -r name version < <(
    tar -xOzf "$tarball" package/package.json |
      node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>{const p=JSON.parse(s);console.log(p.name,p.version)})'
  )
  if npm view "${name}@${version}" version >/dev/null 2>&1; then
    echo "publish-npm: ${name}@${version} already on npm, skipped"
    continue
  fi
  if npm publish "$tarball" --access public --provenance "${dry_run[@]}"; then
    echo "publish-npm: ${name}@${version} published${dry_run:+ (dry run)}"
  else
    failed+=("${name}@${version}")
  fi
done

if ((${#failed[@]} > 0)); then
  echo "publish-npm: could not publish: ${failed[*]}" >&2
  exit 1
fi
