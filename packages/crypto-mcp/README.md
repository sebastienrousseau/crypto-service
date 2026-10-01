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

- **Standard MCP Protocol**: JSON-RPC 2.0 over stdio, with tools, resources and prompts.
- **Key handles, not key material**: keys are generated, unwrapped or derived inside the server process. Tools return an opaque `keyHandle` (`kh_` followed by 32 hex characters) plus public metadata; no tool returns a private key, a symmetric key or a DEK, and no tool accepts one.
- **Post-Quantum Cryptography (PQC)**: ML-KEM-768 (NIST FIPS 203) key generation, encapsulation and decapsulation.
- **Classical Primitives**: RSA-2048/3072/4096 (RSASSA-PSS), ECDSA on P-256, P-384 and secp256k1, Ed25519, HMAC-SHA256, and AES-256-GCM / ChaCha20-Poly1305.
- **Envelope Encryption**: wrap and unwrap DEKs under a key-encryption key. Only the `local` provider (random, in-process keys that do not survive a restart) is configured; `aws`, `gcp`, `azure` and `vault` return an error.
- **Cryptographic Bill of Materials (CBOM)**: classify algorithm names into a CycloneDX 1.6 CBOM inventory.
- **Validated input**: every tool call is checked against the tool's declared JSON schema before it runs.

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

| Tool Name                | Description                                                      | Key Parameters                                                                               |
| ------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `crypto_generate_key`    | Generate a key in the server; returns its handle and public key  | `type` (rsa, ecc, ed25519, ml-kem-768, symmetric-256, hmac-sha256), `modulusLength`, `curve` |
| `crypto_key_list`        | List held key handles with type and public metadata              | none                                                                                         |
| `crypto_key_destroy`     | Wipe a key and invalidate its handle                             | `keyHandle`                                                                                  |
| `crypto_encrypt`         | AEAD-encrypt under a key handle (a new key if none is given)     | `plaintext`, `keyHandle`, `algorithm` (aes-256-gcm, chacha20-poly1305)                       |
| `crypto_decrypt`         | Authenticate and decrypt an AEAD ciphertext                      | `ciphertext`, `keyHandle`, `iv`, `authTag`, `algorithm`                                      |
| `crypto_sign`            | Sign with a key handle; the algorithm follows the key            | `data`, `keyHandle`                                                                          |
| `crypto_verify`          | Verify against a public key PEM or a key handle                  | `data`, `signature`, `publicKey` or `keyHandle`                                              |
| `crypto_hash`            | Compute a digest                                                 | `data`, `algorithm` (sha256, sha384, sha512, sha3-256, blake2b512)                           |
| `crypto_kem_encapsulate` | ML-KEM-768 encapsulation; the shared secret becomes a key handle | `publicKey`                                                                                  |
| `crypto_kem_decapsulate` | ML-KEM-768 decapsulation with a key handle                       | `keyHandle`, `ciphertext`                                                                    |
| `crypto_kms_wrap`        | Wrap the DEK behind a key handle under a KMS-held KEK            | `provider`, `keyId`, `keyHandle`                                                             |
| `crypto_kms_unwrap`      | Unwrap a DEK into a new key handle                               | `provider`, `keyId`, `wrappedKey`                                                            |
| `crypto_inspect_key`     | Classify a PEM or OpenPGP armored key and fingerprint it         | `keyData`                                                                                    |
| `crypto_audit_cbom`      | Classify algorithm names into a CBOM                             | `algorithms`                                                                                 |

Signature algorithms by key type: `ed25519` signs Ed25519, `rsa` signs RSASSA-PSS (SHA-256, MGF1-SHA-256, 32-byte salt), `ecc` signs ECDSA with SHA-256 (SHA-384 on P-384, DER-encoded), and `hmac-sha256` computes HMAC-SHA256.

### Key handles

A key handle is a capability: whoever can call the server with it can use the key, but cannot read it. Handles live only as long as the server process. The store holds at most 64 keys; adding one more destroys the least recently used key, so a client that needs a key for long should keep using it or expect to generate a new one. `crypto_key_destroy` removes a key at once.

A typical session:

1. `crypto_generate_key` with `type: "ed25519"` returns `keyHandle` and `publicKey`.
2. `crypto_sign` with `data` and that `keyHandle` returns `algorithm: "ed25519"` and `signature`.
3. Anyone can check the signature with `crypto_verify` and the `publicKey`.

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

- **No secret material in the conversation**: private keys, symmetric keys, DEKs and KEM shared secrets stay in the server process behind key handles. `crypto_verify` refuses a private key PEM instead of deriving its public half.
- **Bounded key store**: at most 64 keys, least recently used evicted first. Raw secret bytes (symmetric, HMAC and ML-KEM secret keys) are overwritten with zeros when a key is evicted or destroyed. Asymmetric private keys are Node.js `KeyObject`s, which JavaScript cannot wipe; they are released for garbage collection. Transient copies (for example the hex strings `@sebastienrousseau/crypto-lib` uses for ML-KEM) are not wiped either.
- **Input Validation**: every `tools/call` is checked against the tool's `inputSchema`: unknown properties, missing required properties, wrong types, values outside an enum and strings outside their declared length or format are rejected before the tool runs. Error messages name the property but never echo its value.
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
