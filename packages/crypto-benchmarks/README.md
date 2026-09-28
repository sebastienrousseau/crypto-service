<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# `@sebastienrousseau/crypto-benchmarks`

> Performance benchmarking and latency profiling harness comparing classical vs post-quantum cryptographic primitives across JavaScript, WebAssembly, and native runtimes.

[![Version](https://img.shields.io/npm/v/@sebastienrousseau/crypto-benchmarks.svg)](https://www.npmjs.com/package/@sebastienrousseau/crypto-benchmarks)
[![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](https://opensource.org/licenses/MIT)

---

## Overview

`@sebastienrousseau/crypto-benchmarks` provides high-precision latency, throughput (MB/s), and operations-per-second (ops/sec) profiling across classical algorithms (RSA, ECDSA, AES, SHA-2) and post-quantum standards (NIST FIPS 203 ML-KEM, FIPS 204 ML-DSA, FIPS 205 SLH-DSA).

## Features

- **High-Precision Timing Harness**: Sub-microsecond timing using `process.hrtime.bigint()` with statistical distribution metrics (mean, median, p95, p99, standard deviation, ops/sec).
- **Comparative Profiling**:
  - Symmetric Encryption: `AES-256-GCM` vs `ChaCha20-Poly1305` vs `AES-128-CBC`.
  - Asymmetric Signatures: `ML-DSA-65` vs `Ed25519` vs `ECDSA-P256` vs `RSA-2048`.
  - Key Encapsulation: `ML-KEM-768` vs `ECDH` vs `RSA-3072`.
  - Cryptographic Hashing: `SHA-256` vs `SHA-512` vs `SHA3-256` vs `BLAKE2b`.
- **Multiple Output Formats**: Human-readable tables, JSON reports, and Markdown summaries suitable for CI performance tracking.

## CLI Usage

```bash
# Run all benchmark suites
crypto-benchmarks --suite all

# Run specific suite with custom iterations
crypto-benchmarks --suite pqc --iterations 100 --format markdown

# Output JSON report for automated monitoring
crypto-benchmarks --suite symmetric --format json > report.json
```

## Programmatic API

```typescript
import {
  runSuite,
  benchmarkSymmetric,
  benchmarkPqc,
} from "@sebastienrousseau/crypto-benchmarks";

// Run comprehensive benchmark
const report = await runSuite({ suite: "all", iterations: 50 });
console.log(report.summaryMarkdown);
```

---

## Development

```bash
pnpm --filter @sebastienrousseau/crypto-benchmarks run build
pnpm --filter @sebastienrousseau/crypto-benchmarks run test
pnpm --filter @sebastienrousseau/crypto-benchmarks run lint
pnpm --filter @sebastienrousseau/crypto-benchmarks run format
```

All 18 packages in the Crypto Service workspace maintain a **100% coverage floor** across statements, branches, functions, and lines.

---

## Documentation

- [Full Suite Documentation](https://docs.crypto-service.co/)
- [API Reference (TypeDoc)](https://docs.crypto-service.co/packages/crypto-benchmarks/)
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
