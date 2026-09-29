<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# `@sebastienrousseau/crypto-lsp`

> Language Server Protocol (LSP) providing real-time cryptographic static analysis, quantum-vulnerability flagging, PEM/OpenPGP validation, and automated quick fixes for IDEs (VS Code, NeoVim, JetBrains, Emacs).

[![Version](https://img.shields.io/npm/v/@sebastienrousseau/crypto-lsp.svg)](https://www.npmjs.com/package/@sebastienrousseau/crypto-lsp)
[![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](https://opensource.org/licenses/MIT)

---

## Overview

`@sebastienrousseau/crypto-lsp` brings institutional-grade cryptographic intelligence directly into developer IDEs via the Language Server Protocol (LSP 3.17). It actively monitors code buffers for broken primitives, inadequate key sizes, quantum vulnerabilities (Harvest-Now-Decrypt-Later risks), hardcoded secret material, and malformed PEM/OpenPGP blocks.

## Key Capabilities

- **Real-Time Static Cryptographic Linting**:
  - `CRYPTO-001`: Detects broken hash functions (`MD5`, `SHA-1`, `MD4`, `RIPEMD160`).
  - `CRYPTO-002`: Detects insecure symmetric ciphers and modes (`DES`, `3DES`, `RC4`, `ECB` mode).
  - `CRYPTO-003`: Flags inadequate RSA key sizes (`< 2048` bits).
  - `CRYPTO-004`: Quantum Vulnerability Flagging for classical public-key cryptography (`RSA`, `ECDSA`, `ECDH`, `Ed25519`) in long-term data security contexts.
  - `CRYPTO-005`: Flags hardcoded secret/private keys in source files.
  - `CRYPTO-006`: Validates PEM and OpenPGP armored block syntax.
- **Intelligent QuickFix Actions**:
  - Automated replacement of broken hashes (e.g. `MD5` -> `SHA-256`).
  - Automated replacement of insecure cipher modes (e.g. `aes-128-ecb` -> `aes-256-gcm`).
- **Interactive Hover Documentation**:
  - Displays NIST FIPS 203/204/205 standards, quantum security levels, and regulatory compliance mapping (DORA, CRA, CNSA 2.0).
- **Context-Aware Completion Provider**:
  - Autocompletes modern symmetric, asymmetric, and post-quantum algorithms with recommended parameters.

## Installation & CLI Usage

```bash
# Global installation
pnpm add -g @sebastienrousseau/crypto-lsp

# Run stdio LSP server
crypto-lsp --stdio
```

## Editor Integration

### VS Code

Configure in your `.vscode/settings.json`:

```json
{
  "crypto.lsp.serverPath": "crypto-lsp"
}
```

### NeoVim (lspconfig)

```lua
vim.lsp.start({
  name = 'crypto-lsp',
  cmd = {'crypto-lsp', '--stdio'},
  root_dir = vim.fs.dirname(vim.fs.find({'package.json', '.git'}, { upward = true })[1]),
})
```

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-lsp run build
pnpm --filter @sebastienrousseau/crypto-lsp run test
pnpm --filter @sebastienrousseau/crypto-lsp run lint
pnpm --filter @sebastienrousseau/crypto-lsp run format
```

All 18 packages in the Crypto Service workspace maintain a **100% coverage floor** across statements, branches, functions, and lines.

---

## Documentation

- [Full Suite Documentation](https://docs.crypto-service.co/)
- [API Reference (TypeDoc)](https://docs.crypto-service.co/packages/crypto-lsp/)
- [Developer Guide](../../DEVELOPMENT.md)
- [Security Policy](../../SECURITY.md)
- [Architecture & Design](../../ARCHITECTURE.md)

---

## Stability guarantees

Versions advance strictly one step at a time on the `0.0.x` line (`v0.0.1` → `v0.0.2` → `v0.0.3` ... → `v0.0.999` → `v0.1.0`). Work for every release iteration begins on a dedicated `feat/v<version>` branch.

All 18 packages in the workspace move in lockstep. Public API signatures, cipher output formats, and serialization schemas are strictly versioned. Breaking changes to serialized formats or algorithm defaults are considered major breaking changes. Minimum toolchain upgrades (e.g. Node.js LTS floor) are governed by [POLICIES.md](../../docs/POLICIES.md).

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service Suite contributors.
