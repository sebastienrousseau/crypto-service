<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# `@sebastienrousseau/crypto-cbom`

> Cryptographic Bill of Materials (CBOM) generator and auditor: CycloneDX 1.6 and SPDX 3.0 output, plus a heuristic quantum-readiness score.

[![Version](https://img.shields.io/npm/v/@sebastienrousseau/crypto-cbom.svg)](https://www.npmjs.com/package/@sebastienrousseau/crypto-cbom)
[![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](https://opensource.org/licenses/MIT)

---

## Overview

`@sebastienrousseau/crypto-cbom` provides automated inventory, specification, and auditing of cryptographic assets across codebases and enterprise systems. It maps algorithms, protocols, key lengths, cipher modes, and certificates into standardized machine-readable CycloneDX 1.6 Cryptographic BOM and SPDX 3.0 formats.

The auditor classifies each asset by algorithm name and returns a posture score (0–100), a `PASS` / `REVIEW` / `FAIL` status and findings that cite the guidance they draw on:

- **NIST SP 800-131A**: broken or disallowed primitives (MD5, SHA-1, DES, RC4, ECB).
- **NIST IR 8547** (draft): quantum-vulnerable public-key algorithms (RSA, ECC, Ed25519).
- **CNSA 2.0**: symmetric keys below 256 bits.

The result is a heuristic over names found in code or a CBOM. It is evidence you can use in a DORA or CRA assessment, not a compliance verdict.

## CLI Usage

```bash
# Generate CycloneDX 1.6 CBOM from source directory
crypto-cbom scan ./src --format cyclonedx --output cbom.json

# Generate SPDX 3.0 CBOM
crypto-cbom scan ./src --format spdx --output cbom-spdx.json

# Audit an existing CBOM (exit code 1 when the status is FAIL)
crypto-cbom audit cbom.json
```

## Programmatic API

```typescript
import {
  scanDirectory,
  generateCycloneDxCbom,
  auditCbom,
} from "@sebastienrousseau/crypto-cbom";

// 1. Scan codebase for cryptographic assets
const assets = scanDirectory("./src");

// 2. Generate standard CycloneDX 1.6 CBOM
const cbomDoc = generateCycloneDxCbom(assets, {
  componentName: "financial-payment-engine",
  componentVersion: "1.0.0",
});

// 3. Score the cryptographic posture (heuristic; not a compliance verdict)
const audit = auditCbom(cbomDoc);
console.log(`Posture: ${audit.status}, score ${audit.score}/100`);
console.log(`Quantum Safe Assets: ${audit.quantumSafeRatio * 100}%`);
```

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-cbom run build
pnpm --filter @sebastienrousseau/crypto-cbom run test
pnpm --filter @sebastienrousseau/crypto-cbom run lint
pnpm --filter @sebastienrousseau/crypto-cbom run format
```

All 18 packages in the Crypto Service workspace maintain a **100% coverage floor** across statements, branches, functions, and lines.

---

## Documentation

- [Full Suite Documentation](https://docs.crypto-service.co/)
- [API Reference (TypeDoc)](https://docs.crypto-service.co/packages/crypto-cbom/)
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
