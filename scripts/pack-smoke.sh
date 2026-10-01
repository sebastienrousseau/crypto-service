#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0 OR MIT
#
# Pack the published packages, install the tarballs into an empty
# project with npm (as a user would), then load the library, run the
# CBOM CLI and boot the server. Catches runtime dependencies declared
# only as devDependencies and broken entry points, which workspace
# tests cannot see.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

work="$(mktemp -d)"
port="${SMOKE_PORT:-3917}"
server_pid=""
cleanup() {
  if [[ -n "$server_pid" ]]; then kill "$server_pid" 2>/dev/null || true; fi
  rm -rf "$work"
}
trap cleanup EXIT

packages=(crypto-lib crypto-cbom crypto-server crypto-cli)
for p in "${packages[@]}"; do
  (cd "packages/$p" && pnpm pack --pack-destination "$work" >/dev/null)
done

# Install each package with only the internal packages its manifest
# declares (resolved transitively from the packed package.json files), so
# a runtime import missing from "dependencies" fails here as it would for
# a user. Installing every tarball together would hide it by hoisting.
install_with_declared_deps() {
  local target="$1" dir="$2"
  local tarballs
  tarballs="$(node - "$work" "$target" <<'NODE'
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const [work, target] = process.argv.slice(2);
const byName = {};
for (const f of fs.readdirSync(work).filter((f) => f.endsWith(".tgz"))) {
  const pkg = JSON.parse(
    execFileSync("tar", ["-xOf", path.join(work, f), "package/package.json"]),
  );
  byName[pkg.name] = { file: path.join(work, f), deps: pkg.dependencies || {} };
}
const seen = new Set();
const visit = (name) => {
  if (seen.has(name) || !byName[name]) return;
  seen.add(name);
  for (const dep of Object.keys(byName[name].deps)) visit(dep);
};
visit(`@sebastienrousseau/${target}`);
console.log([...seen].map((n) => byName[n].file).join(" "));
NODE
)"
  mkdir -p "$dir"
  (cd "$dir" && npm init -y >/dev/null && \
    npm install --no-audit --no-fund $tarballs >/dev/null)
}

for p in "${packages[@]}"; do
  install_with_declared_deps "$p" "$work/$p"
done

cd "$work/crypto-lib"
node -e 'const l = require("@sebastienrousseau/crypto-lib"); if (Object.keys(l).length === 0) process.exit(1);'
(cd "$work/crypto-cbom" && node node_modules/@sebastienrousseau/crypto-cbom/dist/cli.js --help >/dev/null)
(cd "$work/crypto-cli" && node -e 'require("@sebastienrousseau/crypto-cbom"); require("@sebastienrousseau/crypto-lib");')

# The installed crypto-cli binary hashes standard input non-interactively
# and prints the digest as JSON (`crypto-cli hash --json < file`).
(
  cd "$work/crypto-cli"
  printf 'crypto-cli pack smoke\n' >input.txt
  ./node_modules/.bin/crypto-cli hash --json <input.txt >hash.json
  node -e '
    const fs = require("fs");
    const got = JSON.parse(fs.readFileSync("hash.json", "utf8"));
    const want = require("crypto").createHash("sha256")
      .update(fs.readFileSync("input.txt")).digest("hex");
    if (got.algorithm !== "sha256" || got.digest !== want || got.length !== 32) {
      console.error("pack-smoke: unexpected crypto-cli hash output", got);
      process.exit(1);
    }
  '
)

cd "$work/crypto-server"

CRYPTO_API_KEY=smoke PORT="$port" NODE_ENV=production \
  node node_modules/@sebastienrousseau/crypto-server/dist/index.js >server.log 2>&1 &
server_pid=$!

for _ in $(seq 1 30); do
  if curl -sf "http://localhost:$port/ready" >/dev/null; then break; fi
  sleep 1
done

status() {
  curl -s -o /dev/null -w '%{http_code}' -X POST "http://localhost:$port/v2/hash" \
    -H 'content-type: application/json' "$@" \
    -d '{"algorithm":"sha256","data":"x"}'
}

if ! curl -sf "http://localhost:$port/ready" >/dev/null; then
  cat server.log
  echo "pack-smoke: server did not become ready" >&2
  exit 1
fi
[[ "$(status)" == "401" ]] || { echo "pack-smoke: expected 401 without a key" >&2; exit 1; }
[[ "$(status -H 'x-api-key: smoke')" == "200" ]] || { echo "pack-smoke: expected 200 with a key" >&2; exit 1; }

echo "pack-smoke: ok"
