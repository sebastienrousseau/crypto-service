# Security Policy

We take the security of our software products and services seriously. This
includes all source code in this repository.

## Supported Versions

Only the latest minor release on `main` is supported with security fixes.
Older releases will not receive backports.

| Version  | Supported          |
|----------|--------------------|
| `0.0.x`  | :white_check_mark: |
| `< 0.0`  | :x:                |

## Reporting a Vulnerability

**Please do not file public GitHub issues for security vulnerabilities.**
Use one of the channels below instead, in order of preference:

1. **GitHub private security advisory** (preferred):
   <https://github.com/sebastienrousseau/crypto-service/security/advisories/new>
   This is the fastest path — it creates a private discussion thread
   between you and the maintainers and lets us coordinate a fix and CVE.

2. **Email:** `sebastian.rousseau+security@gmail.com`
   Use the OpenPGP public key published on
   <https://sebastienrousseau.com/security.txt> for sensitive details.

We aim to acknowledge reports within **3 working days** and to issue a fix
or mitigation within **30 days** of the initial report, depending on
severity and complexity.

## What to Include

To help us triage quickly, please include as much of the following as you
can:

- **Type of issue** (e.g. crash, key leakage, signature bypass, injection,
  side-channel, supply-chain).
- **Affected package(s)** (`crypto-lib`, `crypto-server`, `crypto-cli`,
  `crypto-api`) and **version(s)**.
- **Affected source file(s)** and the relevant tag, branch, or commit SHA.
- **Step-by-step reproduction** — exact commands, inputs, and expected vs
  actual behaviour.
- **Proof-of-concept** code or trace if you have one.
- **Impact assessment** — what an attacker could do, who is exposed, and
  whether you believe it's exploitable in default configurations.
- **Suggested mitigation** if you have one.

## Coordinated Disclosure

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure):

1. You report privately via one of the channels above.
2. We acknowledge, triage, and develop a fix in a private branch.
3. We agree on a disclosure date with you.
4. We publish the fix, the advisory, and any CVE assignment together.
5. We credit you in the advisory unless you prefer to remain anonymous.

## Hardening Defaults

The Crypto Service Suite is designed to fail safe:

- **CI hygiene job** fails the build on any committed `.key`, `.asc`,
  `.pem`, `.p12`, or `.pfx` file.
- **`crypto-lib` is pure** — it never reads the filesystem and never logs
  passphrases. Key material is supplied by the caller as armored ASCII.
- **`crypto-server` enforces** a 32-character minimum on `JWT_SECRET`,
  default-deny CORS, helmet, schema validation on every body, JWT auth on
  every `/v1/*` route, rate limiting (10/min/IP), and pino redaction of
  Authorization headers and every passphrase path.
- **No weak primitives in defaults** — RSA keys are 2048 bit minimum, ECC
  defaults to curve25519, and the legacy `keySize512`/`keySize1024`
  modules were removed in v0.0.3 with a regression test guarding their
  re-introduction.

## Out of Scope

The following are intentionally out of scope and will be closed as
"won't fix":

- Findings against an unmaintained release (anything below `0.0.3`).
- Theoretical attacks against OpenPGP itself — please report those to the
  upstream [OpenPGP.js](https://github.com/openpgpjs/openpgpjs) project.
- Reports that depend on a misconfiguration explicitly warned against in
  the README (e.g. `JWT_SECRET="dev"`, `CORS_ORIGINS=*` in production,
  `TRUST_PROXY=true` without an allow-list).
- Findings inside `node_modules/` or in dependencies — please report those
  to the upstream maintainers and we will pull in the fix once it lands.
