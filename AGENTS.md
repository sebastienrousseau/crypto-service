<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# AGENTS.md

Invariants for AI-assisted contributors working in this repository. A
human contributor reads [CONTRIBUTING.md](CONTRIBUTING.md) and
[DEVELOPMENT.md](DEVELOPMENT.md); an agent reads those too, plus this
list of things that must never drift, because they are the ones an
automated change is most likely to get wrong.

## Versioning

- The version is `0.0.x` and moves **strictly one step at a time** (+0.0.1).
  Never propose a 0.1.0 or 1.0 jump; to achieve `v0.1.0`, the project must have
  progressed through `v0.0.999`.
- Work for the next iteration MUST begin on a branch named `feat/v<next-version>`.
- **Single Active Release PR Invariant**: Across this repository, there MUST be at most ONE active pull request targeting `main`, which MUST be the release iteration branch `feat/v<next-version>`.
- **Branch Funneling Policy**: Any Dependabot PRs, security fixes, documentation updates, or auxiliary topic branches MUST NEVER be merged directly into `main`. They MUST ALWAYS be merged into the active `feat/v<next-version>` branch, and their standalone PRs targeting `main` closed. All iteration work funnels into the single release PR.
- All 18 packages in this pnpm workspace move in lockstep:
  `@sebastienrousseau/crypto-lib`, `@sebastienrousseau/crypto-server`,
  `@sebastienrousseau/crypto-cli`, `@sebastienrousseau/crypto-sdk`,
  `@sebastienrousseau/crypto-api`, `@sebastienrousseau/crypto-middleware`,
  `@sebastienrousseau/crypto-react`, `@sebastienrousseau/crypto-vue`,
  `@sebastienrousseau/crypto-edge`, `@sebastienrousseau/crypto-kms`,
  `@sebastienrousseau/crypto-prisma`, `@sebastienrousseau/crypto-typeorm`,
  `@sebastienrousseau/crypto-wasm`, `@sebastienrousseau/crypto-testing`,
  `@sebastienrousseau/crypto-mcp`, `@sebastienrousseau/crypto-lsp`,
  `@sebastienrousseau/crypto-cbom`, `@sebastienrousseau/crypto-benchmarks`.
- When updating version, all package manifests (`packages/*/package.json`), root
  `package.json`, `CITATION.cff`, and `CHANGELOG.md` move together.
- Published GitHub releases MUST follow the standard template
  (<https://github.com/sebastienrousseau/passmcp/releases/tag/v0.0.5>),
  titled `<PROJECT_NAME> <VERSION>` with `## Highlights ⭐️`, `## What's Changed`,
  `## Checksums`, and `**Full Changelog**`.

## Commits and signing

- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, …), imperative
  subject line (maximum 50 chars), body wrapped strictly at 72 chars explaining
  WHAT and WHY.
- Every commit carries a `Signed-off-by` trailer (`format.signoff = true`) and is
  SSH-signed (`commit.gpgsign = true`).
- Never rewrite published history. No `--force`, no `--amend` on pushed commits,
  no rebase of a shared branch.
- Never merge a pull request into `main` without explicit maintainer direction.

## Quality gates and Definition of Done

- Verification gates MUST pass before claiming completion:
  - `pnpm -r run build` (all 18 packages compile with zero errors)
  - `pnpm -r run lint` (zero lint warnings/errors)
  - `pnpm -r run format` (zero format discrepancies)
  - `pnpm -r run test` (test suite with **100% statements, branches, functions, and lines** coverage floor across every package)
  - `pnpm -r run docs` (TypeDoc builds with zero errors)
- "It compiles" or "it runs locally" is not the definition of done. State
  explicitly what command was run and what the result was.
- Every behavior change lands with its test in the same commit.

## Data and licenses

- Every source file retains its SPDX header (`Apache-2.0 OR MIT`); Markdown
  files carry `<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->` on line 1.
- Never edit generated output (directories such as `dist/`, build artifacts,
  or generated TypeDoc output).
- Never commit private keys, real cryptographic keys, or credentials. Key
  fixtures in test directories are synthetic test vectors only.

## Structure

- Canonical repository structure follows `REPO-STANDARD.md`.
- `docs/` is the documentation root for guides, architecture, and ADRs.
- Root configuration files (`tsconfig.base.json`, `pnpm-workspace.yaml`,
  `.editorconfig`) maintain monorepo consistency without conflicting formatters.

## Off-limits without maintainer authorization

- Force pushes, history rewrites, tag deletion or re-tagging.
- Publishing packages to the npm registry.
- Lowering coverage thresholds below 100%.
- Weakening cryptographic algorithms, security invariants, or test timeouts.
