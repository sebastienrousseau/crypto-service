// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Enterprise Key Management Service adapters.
 *
 * Provides a unified KmsProvider interface with implementations for
 * AWS KMS, Google Cloud KMS, Azure Key Vault, and HashiCorp Vault.
 */

export type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "./types";
export { AwsKmsProvider } from "./providers/aws";
export type { AwsKmsOptions } from "./providers/aws";
export { GcpKmsProvider } from "./providers/gcp";
export type { GcpKmsOptions } from "./providers/gcp";
export { AzureKmsProvider } from "./providers/azure";
export type { AzureKmsOptions } from "./providers/azure";
export { VaultKmsProvider } from "./providers/vault";
export type { VaultKmsOptions } from "./providers/vault";
export { LocalKmsProvider } from "./providers/local";
