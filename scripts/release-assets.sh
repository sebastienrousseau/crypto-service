#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0 OR MIT
#
# Download the npm tarballs attached to an existing GitHub release, so the
# release workflow can publish that release again when its own run did
# not reach the registries.
#
# Every tarball must carry the tag's version and match the SHA-256 the
# release notes list under Checksums, so the registries receive exactly
# the bytes the release page states. Anything else fails before a publish.
#
# Usage: scripts/release-assets.sh <tag> <dir>
set -euo pipefail

tag="${1:?usage: scripts/release-assets.sh <tag> <dir>}"
dir="${2:?usage: scripts/release-assets.sh <tag> <dir>}"
if [[ ! "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "release-assets: not a release tag: $tag" >&2
  exit 1
fi
version="${tag#v}"

if [[ -e "$dir" ]]; then
  echo "release-assets: $dir already exists" >&2
  exit 1
fi
mkdir -p "$dir"
gh release download "$tag" --pattern '*.tgz' --dir "$dir"

sums="$(mktemp)"
trap 'rm -f "$sums"' EXIT
gh release view "$tag" --json body --jq .body |
  grep -E '^[0-9a-f]{64}  [A-Za-z0-9._-]+\.tgz$' >"$sums" || true

shopt -s nullglob
tarballs=("$dir"/*.tgz)
listed="$(wc -l <"$sums" | tr -d ' ')"
if ((${#tarballs[@]} == 0)) || [[ "$listed" != "${#tarballs[@]}" ]]; then
  echo "release-assets: $tag has ${#tarballs[@]} tarball(s) but its notes list $listed checksum(s)" >&2
  exit 1
fi

if command -v sha256sum >/dev/null; then
  (cd "$dir" && sha256sum --check --strict "$sums")
else
  (cd "$dir" && shasum -a 256 --check --strict "$sums")
fi

for tarball in "${tarballs[@]}"; do
  found="$(tar -xOzf "$tarball" package/package.json |
    node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>console.log(JSON.parse(s).version))')"
  if [[ "$found" != "$version" ]]; then
    echo "release-assets: $(basename "$tarball") is version $found, not $version" >&2
    exit 1
  fi
done
echo "release-assets: ${#tarballs[@]} tarballs of $tag match the release checksums"
