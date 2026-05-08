<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-kms-logo.svg" alt="crypto-kms" width="128" />
</p>

<h1 align="center">crypto-kms</h1>

<p align="center">
  Enterprise key management adapters for AWS KMS, Google Cloud KMS, Azure Key Vault, and HashiCorp Vault -- unified under a single TypeScript interface.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-kms"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-kms?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License MIT" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

- [Install](#install) — add the package to your project
- [Quick Start](#quick-start) — create a provider and manage keys in four lines
- [Providers](#providers) — supported cloud and local backends
- [API Reference](#api-reference) — the `KmsProvider` interface
- [Authentication](#authentication) — credentials for each provider
- [Examples](#examples) — runnable scripts for every pattern
- [Security](#security) — responsible disclosure
- [License](#license) — Apache-2.0 OR MIT

---

## Install

**npm / pnpm**

```bash
npm install @sebastienrousseau/crypto-kms
# or
pnpm add @sebastienrousseau/crypto-kms
```

Then install the peer dependency for your cloud provider:

```bash
# AWS
npm install @aws-sdk/client-kms

# Google Cloud
npm install @google-cloud/kms

# Azure
npm install @azure/keyvault-keys
```

> **Requirements:** Node >= 22. The local provider has zero additional dependencies.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Quick Start

```ts
import { LocalKmsProvider } from "@sebastienrousseau/crypto-kms";

const kms = new LocalKmsProvider();
const key = await kms.createKey("aes-256-gcm", "encrypt");
const encrypted = await kms.encrypt(
  key.keyId,
  new TextEncoder().encode("secret"),
);
const decrypted = await kms.decrypt(key.keyId, encrypted.ciphertext);
console.log(new TextDecoder().decode(decrypted.plaintext)); // "secret"
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Providers

| Provider  | Class              | Backend                    | Peer Dependency        |
| --------- | ------------------ | -------------------------- | ---------------------- |
| **AWS**   | `AwsKmsProvider`   | AWS Key Management Service | `@aws-sdk/client-kms`  |
| **GCP**   | `GcpKmsProvider`   | Google Cloud KMS           | `@google-cloud/kms`    |
| **Azure** | `AzureKmsProvider` | Azure Key Vault            | `@azure/keyvault-keys` |
| **Vault** | `VaultKmsProvider` | HashiCorp Vault Transit    | None (uses `fetch`)    |
| **Local** | `LocalKmsProvider` | In-memory (crypto-lib)     | None                   |

All providers implement the same `KmsProvider` interface, making it trivial to swap backends without changing application code.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## API Reference

Every provider exposes the `KmsProvider` interface:

| Method                                       | Description                                                |
| -------------------------------------------- | ---------------------------------------------------------- |
| `listKeys(filters?)`                         | List all managed keys, with optional usage/enabled filters |
| `getKey(keyId)`                              | Retrieve metadata for a specific key                       |
| `createKey(algorithm, usage, metadata?)`     | Create a new managed key                                   |
| `enableKey(keyId)`                           | Enable a disabled key                                      |
| `disableKey(keyId)`                          | Disable a key (soft delete)                                |
| `scheduleKeyDeletion(keyId, days?)`          | Schedule a key for deletion                                |
| `encrypt(keyId, plaintext, context?)`        | Encrypt plaintext with a managed key                       |
| `decrypt(keyId, ciphertext, context?)`       | Decrypt ciphertext with a managed key                      |
| `sign(keyId, data, algorithm?)`              | Sign data with a managed signing key                       |
| `verify(keyId, data, signature, algorithm?)` | Verify a signature                                         |
| `rotateKey(keyId)`                           | Rotate key material (new version)                          |
| `generateDataKey(keyId, keySpec?)`           | Generate a wrapped data encryption key (DEK)               |

### Key Types

```ts
interface KmsKeyMetadata {
  keyId: string;
  algorithm: string;
  usage: "encrypt" | "sign" | "wrap";
  createdAt: string;
  enabled: boolean;
  provider: string;
}

interface KmsEncryptResult {
  ciphertext: string; // Base64-encoded
  keyId: string;
  context?: Record<string, string>;
}

interface KmsDecryptResult {
  plaintext: Uint8Array;
  keyId: string;
}

interface KmsSignResult {
  signature: string; // Base64-encoded
  keyId: string;
  algorithm: string;
}
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Authentication

| Provider  | Credentials                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **AWS**   | Pass `credentials` in `AwsKmsOptions`, or rely on the default AWS credential chain (env vars, `~/.aws/credentials`, IAM role)            |
| **GCP**   | Uses Application Default Credentials (ADC). Set `GOOGLE_APPLICATION_CREDENTIALS` or run `gcloud auth application-default login`          |
| **Azure** | Uses `@azure/identity` `DefaultAzureCredential`. Set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` or use managed identity |
| **Vault** | Pass `token` in `VaultKmsOptions`. Supports any Vault auth method that produces a token                                                  |
| **Local** | No authentication required                                                                                                               |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/` directory. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category | Example                             | Purpose                                                  |
| -------- | ----------------------------------- | -------------------------------------------------------- |
| Local    | [local.ts](examples/local.ts)       | Create keys, encrypt/decrypt with the in-memory provider |
| AWS      | [aws.ts](examples/aws.ts)           | AWS KMS setup and usage pattern                          |
| Envelope | [envelope.ts](examples/envelope.ts) | Envelope encryption with `generateDataKey`               |
| Rotation | [rotation.ts](examples/rotation.ts) | Key rotation workflow                                    |
| Multi    | [multi.ts](examples/multi.ts)       | Provider-agnostic code across multiple backends          |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

**No native dependencies.** The local provider uses the audited `@noble/*` family via crypto-lib — pure TypeScript, no C bindings.

**Timing-safe comparisons.** Signature verification and MAC validation use constant-time comparison to prevent timing side-channel attacks.

**Responsible disclosure.** Report vulnerabilities via [GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service Suite contributors.

<p align="right"><a href="#contents">Back to Top</a></p>
