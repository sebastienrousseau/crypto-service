<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Ecosystem Comparison

This matrix details the scope and architecture of Crypto Service Suite in comparison with other cryptographic libraries and toolkits in the JavaScript and TypeScript ecosystem.

| Dimension                      | Crypto Service Suite                                            | Web Crypto API (SubtleCrypto)                 | Node.js `crypto`                    | libsodium-wrappers                          |
| :----------------------------- | :-------------------------------------------------------------- | :-------------------------------------------- | :---------------------------------- | :------------------------------------------ |
| **Algorithm Coverage**         | 50+ classical, modern, and post-quantum                         | Standard browser set (AES, RSA, ECDSA, SHA-2) | OpenSSL-backed classical primitives | Modern NaCl primitives (ChaCha, Curve25519) |
| **Post-Quantum Support**       | Native FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA) | None natively                                 | Experimental / build-dependent      | None                                        |
| **Full-Stack Architecture**    | Library, REST Server, CLI, SDK, Middleware, ORM adapters        | Low-level primitives only                     | Low-level runtime module            | Low-level bindings                          |
| **Framework Integrations**     | React hooks, Vue composables, Express/Fastify                   | None                                          | None                                | None                                        |
| **ORM Transparent Encryption** | Prisma client extension, TypeORM column transformers            | None                                          | None                                | None                                        |
| **Key Management (KMS)**       | AWS KMS, Google Cloud KMS, Azure Key Vault envelope adapters    | None                                          | None                                | None                                        |
| **Edge Compatibility**         | Cloudflare Workers, Vercel Edge, Deno adapters                  | Web standards                                 | Node.js runtime only                | WebAssembly build required                  |
| **Observability**              | OpenTelemetry tracing and Prometheus metrics                    | None                                          | None                                | None                                        |
| **License**                    | Apache-2.0 OR MIT                                               | Varies by browser runtime                     | Node.js license                     | ISC                                         |

See the [Features](https://github.com/sebastienrousseau/crypto-service#features) section in `README.md` for algorithm-specific implementation details.
