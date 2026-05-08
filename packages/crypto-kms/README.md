<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->
<!-- Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved. -->

<div align="center">

![Crypto KMS logo](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-kms-logo.svg)

# Crypto KMS

Enterprise key management adapters for AWS KMS, Google Cloud KMS, Azure Key Vault, and HashiCorp Vault — unified under a single TypeScript interface.

[![Build](https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?style=for-the-badge&branch=main)](https://github.com/sebastienrousseau/crypto-service/actions)
[![npm](https://img.shields.io/npm/v/@sebastienrousseau/crypto-kms.svg?style=for-the-badge)](https://www.npmjs.com/package/@sebastienrousseau/crypto-kms)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D22-green.svg?style=for-the-badge)](https://nodejs.org/)

**[Website](https://crypto-service.co)
&middot; [Documentation](https://crypto-service.co/docs/)
&middot; [Submit an Issue](https://github.com/sebastienrousseau/crypto-service/issues)
&middot; [Contributing Guidelines](https://github.com/sebastienrousseau/crypto-service/blob/main/.github/CONTRIBUTING.md)**

</div>

---

## Contents

- [Install](#install) &mdash; Add the package to your project
- [Quick Start](#quick-start) &mdash; Create a provider and manage keys in four lines
- [Providers](#providers) &mdash; Supported cloud and local backends
- [API Reference](#api-reference) &mdash; The `KmsProvider` interface
- [Authentication](#authentication) &mdash; Credentials for each provider
- [Examples](#examples) &mdash; Runnable scripts for every pattern
- [Security](#security) &mdash; Responsible disclosure
- [License](#license) &mdash; MIT

---

## Install

```bash
# npm
npm install @sebastienrousseau/crypto-kms

# yarn
yarn add @sebastienrousseau/crypto-kms

# pnpm
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

---

## Authentication

| Provider  | Credentials                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **AWS**   | Pass `credentials` in `AwsKmsOptions`, or rely on the default AWS credential chain (env vars, `~/.aws/credentials`, IAM role)            |
| **GCP**   | Uses Application Default Credentials (ADC). Set `GOOGLE_APPLICATION_CREDENTIALS` or run `gcloud auth application-default login`          |
| **Azure** | Uses `@azure/identity` `DefaultAzureCredential`. Set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` or use managed identity |
| **Vault** | Pass `token` in `VaultKmsOptions`. Supports any Vault auth method that produces a token                                                  |
| **Local** | No authentication required                                                                                                               |

---

## Examples

Runnable TypeScript examples are provided in the `examples/` directory.

| Example             | File                                    | Description                                              |
| ------------------- | --------------------------------------- | -------------------------------------------------------- |
| Local Provider      | [`local.ts`](./examples/local.ts)       | Create keys, encrypt/decrypt with the in-memory provider |
| AWS KMS             | [`aws.ts`](./examples/aws.ts)           | AWS KMS setup and usage pattern                          |
| Envelope Encryption | [`envelope.ts`](./examples/envelope.ts) | Envelope encryption with `generateDataKey`               |
| Key Rotation        | [`rotation.ts`](./examples/rotation.ts) | Key rotation workflow                                    |
| Multi-Provider      | [`multi.ts`](./examples/multi.ts)       | Provider-agnostic code across multiple backends          |

```bash
npx ts-node examples/local.ts
```

---

## Security

If you discover a security vulnerability, please report it responsibly. Send an email to [security@crypto-service.co](mailto:security@crypto-service.co) instead of opening a public issue. We will acknowledge your report within 48 hours.

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

<p align="right"><a href="#contents">Back to Top</a></p>
