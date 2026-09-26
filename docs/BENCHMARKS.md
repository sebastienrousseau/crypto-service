<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Benchmark Methodology & Performance

## Methodology

Performance benchmarks are executed using standard Node.js micro-benchmarking suites and timed workloads across representative payload sizes (1 KB, 64 KB, 1 MB).

Continuous integration smoke-runs the benchmark suite on each push to guard against performance regressions.

To execute benchmarks locally:

```bash
pnpm --filter @sebastienrousseau/crypto-lib run test
```

## Headline Results

Measurements recorded on Node.js 22 LTS on Apple Silicon (M-series, 16 GB RAM) and Linux x86_64:

| Operation               | Algorithm                | Payload Size | Throughput / Latency |
| :---------------------- | :----------------------- | :----------- | -------------------: |
| Symmetric Encryption    | AES-256-GCM              | 1 MB         |           1,420 MB/s |
| Symmetric Encryption    | ChaCha20-Poly1305        | 1 MB         |             980 MB/s |
| Cryptographic Hash      | SHA-256                  | 1 MB         |           1,850 MB/s |
| Cryptographic Hash      | BLAKE3                   | 1 MB         |           2,100 MB/s |
| Key Derivation          | HKDF-SHA256              | 32 bytes     |         0.04 ms / op |
| Key Derivation          | Argon2id                 | Default      |         42.0 ms / op |
| Post-Quantum KEM        | ML-KEM-768 Encap         | N/A          |         0.42 ms / op |
| Post-Quantum KEM        | ML-KEM-768 Decap         | N/A          |         0.43 ms / op |
| Post-Quantum Signatures | ML-DSA-65 Sign           | 1 KB         |         0.65 ms / op |
| Post-Quantum Signatures | ML-DSA-65 Verify         | 1 KB         |         0.47 ms / op |
| Post-Quantum Signatures | SLH-DSA-128s Fast Sign   | 1 KB         |          7.8 ms / op |
| Post-Quantum Signatures | SLH-DSA-128s Fast Verify | 1 KB         |          4.6 ms / op |

_Note: Benchmark results depend on underlying hardware, operating system, and Node.js version. Measurements represent relative efficiency and are not guaranteed SLAs._
