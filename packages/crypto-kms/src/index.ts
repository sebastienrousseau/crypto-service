// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Enterprise Key Management Service adapters.
 *
 * Provides a unified KmsProvider interface with implementations for
 * AWS KMS, Google Cloud KMS, Azure Key Vault, and HashiCorp Vault.
 */

/** Re-exported KMS provider interface and result types. */
export type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "./types";
export { AwsKmsProvider } from "./providers/aws";
/** Re-exported AWS KMS configuration options type. */
export type { AwsKmsOptions } from "./providers/aws";
export { GcpKmsProvider } from "./providers/gcp";
/** Re-exported GCP KMS configuration options type. */
export type { GcpKmsOptions } from "./providers/gcp";
export { AzureKmsProvider } from "./providers/azure";
/** Re-exported Azure KMS configuration options type. */
export type { AzureKmsOptions } from "./providers/azure";
export { VaultKmsProvider } from "./providers/vault";
/** Re-exported Vault KMS configuration options type. */
export type { VaultKmsOptions } from "./providers/vault";
export { LocalKmsProvider } from "./providers/local";
