// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/** @file Azure Key Vault adapter. Requires `@azure/keyvault-keys` as a peer dependency. */

import type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "../types";

/** Configuration for the Azure Key Vault provider. */
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
  readonly name = "azure";
  private readonly _vaultUrl: string;

  constructor(options: AzureKmsOptions) {
    this._vaultUrl = options.vaultUrl;
  }

  /** The configured vault URL. */
  get vaultUrl(): string {
    return this._vaultUrl;
  }

  // TODO: implement with @azure/keyvault-keys
  async listKeys(_filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  // TODO: implement with @azure/keyvault-keys
  async getKey(_keyId: string): Promise<KmsKeyMetadata> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  // TODO: implement with @azure/keyvault-keys
  async createKey(
    _algorithm: string,
    _usage: "encrypt" | "sign" | "wrap",
    _metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  // TODO: implement with @azure/keyvault-keys
  async enableKey(_keyId: string): Promise<void> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  // TODO: implement with @azure/keyvault-keys
  async disableKey(_keyId: string): Promise<void> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  // TODO: implement with @azure/keyvault-keys
  async scheduleKeyDeletion(
    _keyId: string,
    _pendingWindowDays?: number,
  ): Promise<void> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  // TODO: implement with @azure/keyvault-keys
  async encrypt(
    _keyId: string,
    _plaintext: Uint8Array,
    _context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  // TODO: implement with @azure/keyvault-keys
  async decrypt(
    _keyId: string,
    _ciphertext: string,
    _context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  // TODO: implement with @azure/keyvault-keys
  async sign(
    _keyId: string,
    _data: Uint8Array,
    _algorithm?: string,
  ): Promise<KmsSignResult> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  // TODO: implement with @azure/keyvault-keys
  async verify(
    _keyId: string,
    _data: Uint8Array,
    _signature: string,
    _algorithm?: string,
  ): Promise<boolean> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  // TODO: implement with @azure/keyvault-keys
  async rotateKey(_keyId: string): Promise<KmsKeyMetadata> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }

  // TODO: implement with @azure/keyvault-keys
  async generateDataKey(
    _keyId: string,
    _keySpec?: string,
  ): Promise<{ plaintext: Uint8Array; ciphertext: string }> {
    throw new Error("Not implemented: install @azure/keyvault-keys");
  }
}
