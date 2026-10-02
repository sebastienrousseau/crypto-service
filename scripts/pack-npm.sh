#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0 OR MIT
#
# Pack every public workspace package into one directory, ready for
# scripts/publish-npm.sh. pnpm rewrites `workspace:*` dependencies to
# real versions while packing. The release workflow packs once, after
# the tests, and hands exactly these tarballs to the npm publish job.
#
# Usage: scripts/pack-npm.sh <out-dir>
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

out="${1:?usage: scripts/pack-npm.sh <out-dir>}"
mkdir -p "$out"
out="$(cd "$out" && pwd)"

for dir in packages/crypto-*/; do
  private="$(node -p "Boolean(require('$PWD/${dir}package.json').private)")"
  if [[ "$private" == "true" ]]; then
    continue
  fi
  (cd "$dir" && pnpm pack --pack-destination "$out" | tail -n 1)
done
