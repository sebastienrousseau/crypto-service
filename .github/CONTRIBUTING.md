# Contributing to the Crypto Service Suite

Thank you for considering a contribution. There are several ways to help out.

## Evangelize

Tell people about the Crypto Service Suite. A bigger, more involved community
makes for a better framework.

## How to Contribute

### Bug Reports

If you encounter a bug that hasn't already been filed, please file a bug
report:

- Open a new issue at <https://github.com/sebastienrousseau/crypto-service/issues/new>
- Include a descriptive title that's straight to the point.
- Write a detailed description of the bug, including the exact command(s)
  you ran, the platform (macOS / Linux / WSL / Windows), Node.js version
  (`node --version`), and pnpm version (`pnpm --version`).
- Paste the **full** error output (not a screenshot).
- Wait for someone to triage and add labels.

### Feature Requests

Open a new issue and label it `enhancement`. Describe the use case before the
solution — it makes the discussion much faster.

### Code Contributions

#### Local setup

```bash
git clone git@github.com:sebastienrousseau/crypto-service.git
cd crypto-service
pnpm install --frozen-lockfile
pnpm -r run build
pnpm -r run test
```

- Edit source under `packages/<package>/src/`.
- Add tests under `packages/<package>/__tests__/`.
- **Never** edit anything under `packages/<package>/dist/` — those are build
  artefacts.
- Re-run `pnpm -r run lint && pnpm -r run test` before pushing. The
  pre-commit hook (`.husky/pre-commit`) will run lint for you on commit.

#### Signed commits — REQUIRED

All commits to this repository **must** be cryptographically signed (SSH or
GPG). PRs containing unsigned commits will be flagged and asked to re-sign.

One-time setup:

```bash
# SSH-signing (preferred — works with FIDO2 hardware keys like YubiKey)
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true

# OR GPG-signing
git config --global gpg.format openpgp
git config --global user.signingkey <YOUR-GPG-KEY-ID>
git config --global commit.gpgsign true
```

Verify that a commit is signed:

```bash
git log -1 --show-signature
# expect: Good "git" signature for <you> with <ALGO> key SHA256:...
# or:     gpg: Good signature from "<you>"
```

If you use SSH signing, also add your SSH key under
**Settings → SSH and GPG keys** on GitHub with key type **"Signing Key"**
so the commits show "Verified" in the GitHub UI.

#### Conventional commits

Use the [conventional commits](conventional_commit_messages.md) format:

- `feat(crypto-lib): add stream-mode encrypt`
- `fix(crypto-server): redact authorization header in error logs`
- `docs(readme): document JWT_SECRET requirement`
- `chore(deps): bump openpgp to 5.10.2`
- `test(crypto-cli): cover the help command`
- `refactor(crypto-lib): inline private key decryption helper`
- `ci: bump actions/setup-node to v5`

Use the package name as the scope when the change is package-local. Use no
scope for repo-wide changes (CI, tooling, root config).

#### Pull request hygiene

- One logical change per PR. Split refactors and feature work into separate
  PRs.
- Title follows conventional-commits format.
- Description includes a `## Test plan` checklist.
- CI must be green (lint + build + test on Node 20 and 22, hygiene job,
  Coveralls).
- Do **not** force-push to shared branches without warning reviewers first.
- Do **not** skip git hooks (`--no-verify`) — fix the underlying lint or
  test failure.
- Do **not** add `.key`, `.asc`, `.pem`, `.p12`, or `.pfx` files to the tree
  — the CI hygiene job will fail your build (this is intentional).

#### Where to put what

| Change type | Lives in |
|---|---|
| New crypto operation | `packages/crypto-lib/src/lib/<op>.ts` + corresponding type in `packages/crypto-lib/src/types/types.ts` + spec in `packages/crypto-lib/__tests__/lib/<op>.test.ts` |
| New REST endpoint | `packages/crypto-server/src/routes/v1/<op>.ts` + body type in `packages/crypto-server/src/@types/types.ts` + register in `packages/crypto-server/src/routes/index.ts` + spec in `packages/crypto-server/__tests__/server.test.ts` |
| New CLI command | `packages/crypto-cli/src/commands/<op>.command.ts` + register in `packages/crypto-cli/src/commands/index.ts` + add to the prompts switch in `packages/crypto-cli/src/cli.ts` |
| Translation key | Add to `packages/crypto-cli/src/constants/en.ts` AND mirror in `fr.ts` (TypeScript will fail the build if you forget) |
| Architecture note | `docs/architecture.md` |

### Documentation

Documentation fixes are very welcome. Open a PR with the `docs:` conventional
commit prefix. The same signing/hygiene rules apply.

---

## Release Process

Releases are cut by maintainers using Lerna's independent versioning:

```bash
pnpm install
pnpm run release:prepare   # bumps versions, generates changelogs
pnpm run release:publish   # publishes to the configured registry
```

Tagged releases are visible on
[GitHub Releases](https://github.com/sebastienrousseau/crypto-service/releases).
