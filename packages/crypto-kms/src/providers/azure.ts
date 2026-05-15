// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/** @remarks Azure Key Vault adapter. Requires `@azure/keyvault-keys` as a peer dependency. */

import type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "../types";

/**
 * Configuration for the Azure Key Vault provider.
 *
 * @example
 * ```ts
 * const opts: AzureKmsOptions = {
 *   vaultUrl: "https://my-vault.vault.azure.net",
 * };
 * ```
 */
export interface AzureKmsOptions {
  /** Azure Key Vault URL (e.g. "https://my-vault.vault.azure.net"). */
  vaultUrl: string;
}

/**
 * Azure Key Vault adapter.
 *
 * Wraps the `@azure/keyvault-keys` SDK to provide the unified KmsProvider
 * interface. Install `@azure/keyvault-keys` as a peer dependency.
 *
 * @example
 * ```ts
 * const provider = new AzureKmsProvider({
 *   vaultUrl: "https://my-vault.vault.azure.net",
 * });
 * const key = await provider.createKey("rsa-2048", "encrypt");
 * ```
 */
export class AzureKmsProvider implements KmsProvider {
  /** Provider identifier. */
  readonly name = "azure";
  /** Configured Azure Key Vault URL. */
  private readonly _vaultUrl: string;

  /** Create an Azure Key Vault provider with the given options. */
  constructor(options: AzureKmsOptions) {
    this._vaultUrl = options.vaultUrl;
  }

  /** The configured vault URL. */
  get vaultUrl(): string {
    return this._vaultUrl;
  }

  /** List all keys, optionally filtered by usage or enabled state. */
  async listKeys(_filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  /** Retrieve metadata for a specific key by ID. */
  async getKey(_keyId: string): Promise<KmsKeyMetadata> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  /** Create a new key with the given algorithm and usage. */
  async createKey(
    _algorithm: string,
    _usage: "encrypt" | "sign" | "wrap",
    _metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  /** Enable a previously disabled key. */
  async enableKey(_keyId: string): Promise<void> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  /** Disable a key so it cannot be used for operations. */
  async disableKey(_keyId: string): Promise<void> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  /** Schedule a key for deletion after a pending window. */
  async scheduleKeyDeletion(
    _keyId: string,
    _pendingWindowDays?: number,
  ): Promise<void> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  /** Encrypt plaintext using a managed key. */
  async encrypt(
    _keyId: string,
    _plaintext: Uint8Array,
    _context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  /** Decrypt ciphertext using a managed key. */
  async decrypt(
    _keyId: string,
    _ciphertext: string,
    _context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  /** Sign data using a managed signing key. */
  async sign(
    _keyId: string,
    _data: Uint8Array,
    _algorithm?: string,
  ): Promise<KmsSignResult> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  /** Verify a signature against data. */
  async verify(
    _keyId: string,
    _data: Uint8Array,
    _signature: string,
    _algorithm?: string,
  ): Promise<boolean> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  /** Rotate a key to a new version. */
  async rotateKey(_keyId: string): Promise<KmsKeyMetadata> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  /** Generate a data encryption key (DEK) wrapped by the managed key. */
  async generateDataKey(
    _keyId: string,
    _keySpec?: string,
  ): Promise<{
    /** Plaintext data key bytes. */
    plaintext: Uint8Array;
    /** Encrypted (wrapped) data key. */
    ciphertext: string;
  }> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }
}
