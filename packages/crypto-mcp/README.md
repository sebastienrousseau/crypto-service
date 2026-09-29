<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# `@sebastienrousseau/crypto-mcp`

> Model Context Protocol (MCP) Server for the Crypto Service Suite — exposing cryptographic operations, post-quantum primitives, and key management to AI assistants and agentic workflows.

[![npm version](https://img.shields.io/npm/v/@sebastienrousseau/crypto-mcp.svg)](https://www.npmjs.com/package/@sebastienrousseau/crypto-mcp)
[![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](LICENSE)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/sebastienrousseau/crypto-service)

---

## Overview

`@sebastienrousseau/crypto-mcp` implements the **Model Context Protocol (MCP)** specification, turning the Crypto Service Suite into a secure, tool-enabled cryptographic runtime for AI agents and LLM-driven environments (including Cursor, Antigravity, Claude Desktop, VS Code, and Zed).

Instead of relying on fragile shell scripts or unverified LLM math, agents invoke cryptographically verified tools backed by `@sebastienrousseau/crypto-lib`, `@sebastienrousseau/crypto-kms`, and `@sebastienrousseau/crypto-wasm`.

---

## Features

- **Standard MCP Protocol**: Full compliance with the Model Context Protocol JSON-RPC 2.0 specification via stdio transport.
- **Post-Quantum Cryptography (PQC)**: Tools for NIST FIPS 203 (ML-KEM / Kyber), FIPS 204 (ML-DSA), and Composite Hybrid RFC 10024 key encapsulation.
- **Classical Primitives**: RSA-2048/4096, ECC (P-256, P-384, P-521, secp256k1), Ed25519, OpenPGP (RFC 4880/9580), and AES-256-GCM / ChaCha20-Poly1305.
- **Envelope Encryption**: Direct orchestration of multi-cloud Key Management Systems (AWS KMS, GCP KMS, Azure Key Vault, HashiCorp Vault).
- **Cryptographic Bill of Materials (CBOM)**: Automated discovery and inventory of cryptographic assets for DORA Articles 9/13 and CRA compliance.
- **Zero Runtime Dependencies**: Lightweight, secure stdio architecture operating with strict input schema validation.

---

## Installation

```bash
# Global installation for MCP client configuration
npm install -g @sebastienrousseau/crypto-mcp

# Or use with npx directly
npx @sebastienrousseau/crypto-mcp
```

---

## Configuration

### Claude Desktop / Cursor / Antigravity (`mcpServers` config)

Add the server to your `claude_desktop_config.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "crypto-service": {
      "command": "npx",
      "args": ["-y", "@sebastienrousseau/crypto-mcp"]
    }
  }
}
```

---

## Tools Exposed

| Tool Name             | Description                                                   | Key Parameters                                        |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| `crypto_generate_key` | Generate classical or post-quantum keypairs                   | `type` (rsa, ecc, ed25519, ml-kem-768), `passphrase`  |
| `crypto_encrypt`      | Encrypt data with symmetric, asymmetric, or hybrid algorithms | `data`, `key`, `algorithm`, `armor`                   |
| `crypto_decrypt`      | Decrypt encrypted ciphertexts or armored blocks               | `ciphertext`, `key`, `passphrase`                     |
| `crypto_sign`         | Create cryptographic signatures (clearsign, detached, raw)    | `data`, `privateKey`, `passphrase`, `detached`        |
| `crypto_verify`       | Verify digital signatures against public keys                 | `data`, `signature`, `publicKey`                      |
| `crypto_hash`         | Compute cryptographic hashes or post-quantum signatures       | `data`, `algorithm` (sha256, sha512, blake2b, blake3) |
| `crypto_kms_wrap`     | Wrap a local data encryption key using cloud KMS              | `provider` (aws, gcp, azure, vault), `keyId`, `dek`   |
| `crypto_kms_unwrap`   | Unwrap a wrapped data encryption key using cloud KMS          | `provider`, `keyId`, `wrappedKey`                     |
| `crypto_inspect_key`  | Parse armored OpenPGP keys or PEM certificates                | `keyData`                                             |
| `crypto_audit_cbom`   | Audit a directory for cryptographic assets and produce CBOM   | `targetPath`, `format` (cyclonedx, spdx, summary)     |

---

## Resources Exposed

- `crypto://standards/pqc`: Complete NIST FIPS 203, 204, 205 specification parameters and CNSA 2.0 migration timelines.
- `crypto://algorithms/matrix`: Comprehensive security strength, key size, and deprecation matrix.

---

## Prompts Exposed

- `pqc-migration-plan`: Guided analysis prompt to evaluate legacy cryptographic risk and produce a phased transition roadmap.
- `dora-compliance-check`: Fiduciary audit checklist reviewing cryptographic agility, third-party risk, and CBOM completeness under Regulation (EU) 2022/2554.

---

## Security & Memory Hygiene

`@sebastienrousseau/crypto-mcp` enforces strict separation of concerns:

- **No Private Key Retention**: Private keys and sensitive plaintext inputs are processed in-memory and never cached across MCP requests.
- **Input Validation**: Strict JSON schema bounds on all inputs prevent buffer overflow and injection attacks.
- **Stdio Transport Isolation**: The server communicates over standard input/output with zero open network ports.

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-mcp run build
pnpm --filter @sebastienrousseau/crypto-mcp run test
pnpm --filter @sebastienrousseau/crypto-mcp run lint
pnpm --filter @sebastienrousseau/crypto-mcp run format
```

All 18 packages in the Crypto Service workspace maintain a **100% coverage floor** across statements, branches, functions, and lines.

---

## Documentation

- [Full Suite Documentation](https://docs.crypto-service.co/)
- [API Reference (TypeDoc)](https://docs.crypto-service.co/packages/crypto-mcp/)
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
