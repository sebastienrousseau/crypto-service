#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0 OR MIT
#
# Pack every published package, install each tarball into an empty
# project with npm (as a user would), then require() and import() every
# entry point its "exports" map declares, run the CBOM CLI and boot the
# server through its bin. Catches runtime dependencies declared only as
# devDependencies, broken entry points and exports maps, which
# workspace tests cannot see.
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

# Every package without "private": true, as check-manifests.mjs sees them.
read -r -a packages <<<"$(node -e '
const fs = require("fs");
console.log(fs.readdirSync("packages")
  .filter((d) => d.startsWith("crypto-"))
  .filter((d) => !JSON.parse(fs.readFileSync(`packages/${d}/package.json`)).private)
  .join(" "));
')"
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

# Load every subpath in the package's "exports" map from a CommonJS
# caller (require) and through native ESM (import()), so a missing file,
# an unexported path or a broken condition fails as it would for a user.
# The package name is passed in the environment, not argv: crypto-api
# parses argv when it is loaded.
load_entry_points() {
  local target="$1" dir="$2"
  (cd "$dir" && PKG="@sebastienrousseau/$target" node - <<'NODE'
const name = process.env.PKG;
const { exports: map = {} } = require(`${name}/package.json`);
const specs = Object.keys(map)
  .filter((sub) => sub !== "./package.json")
  .map((sub) => (sub === "." ? name : `${name}/${sub.slice(2)}`));
const loaders = { "require()": async (s) => require(s), "import()": (s) => import(s) };
(async () => {
  for (const spec of specs) {
    for (const [how, load] of Object.entries(loaders)) {
      const mod = await load(spec);
      if (Object.keys(mod).length === 0) throw new Error(`${spec}: ${how} found no exports`);
    }
  }
  console.log(`pack-smoke: ${name}: ${specs.length} entry point(s) load via require() and import()`);
  process.exit(0);
})().catch((err) => {
  console.error(`pack-smoke: ${name}: ${err.message}`);
  process.exit(1);
});
NODE
  )
}

for p in "${packages[@]}"; do
  install_with_declared_deps "$p" "$work/$p"
  load_entry_points "$p" "$work/$p" | grep '^pack-smoke:'
done

(cd "$work/crypto-cbom" && ./node_modules/.bin/crypto-cbom --help >/dev/null)
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

# Started through the bin link, so the shebang is exercised too.
CRYPTO_API_KEY=smoke PORT="$port" NODE_ENV=production \
  ./node_modules/.bin/crypto-server >server.log 2>&1 &
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
