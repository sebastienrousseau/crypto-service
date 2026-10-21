// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Azure Key Vault adapter: a stub. Every method rejects with
 * `NOT_IMPLEMENTED`; no Azure SDK is used, so installing one changes
 * nothing.
 */

import type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "../types";
import { KmsError } from "../errors";

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

/** Message every method rejects with. */
const NOT_IMPLEMENTED_MESSAGE =
  "Not implemented: the Azure Key Vault provider is a stub";

/**
 * Azure Key Vault adapter.
 *
 * A stub that implements the KmsProvider interface so callers can be
 * written against it; every method rejects with `NOT_IMPLEMENTED`.
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
  listKeys(_filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    return Promise.reject(
      new KmsError("NOT_IMPLEMENTED", NOT_IMPLEMENTED_MESSAGE),
    );
  }

  /** Retrieve metadata for a specific key by ID. */
  getKey(_keyId: string): Promise<KmsKeyMetadata> {
    return Promise.reject(
      new KmsError("NOT_IMPLEMENTED", NOT_IMPLEMENTED_MESSAGE),
    );
  }

  /** Create a new key with the given algorithm and usage. */
  createKey(
    _algorithm: string,
    _usage: "encrypt" | "sign" | "wrap",
    _metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    return Promise.reject(
      new KmsError("NOT_IMPLEMENTED", NOT_IMPLEMENTED_MESSAGE),
    );
  }

  /** Enable a previously disabled key. */
  enableKey(_keyId: string): Promise<void> {
    return Promise.reject(
      new KmsError("NOT_IMPLEMENTED", NOT_IMPLEMENTED_MESSAGE),
    );
  }

  /** Disable a key so it cannot be used for operations. */
  disableKey(_keyId: string): Promise<void> {
    return Promise.reject(
      new KmsError("NOT_IMPLEMENTED", NOT_IMPLEMENTED_MESSAGE),
    );
  }

  /** Schedule a key for deletion after a pending window. */
  scheduleKeyDeletion(
    _keyId: string,
    _pendingWindowDays?: number,
  ): Promise<void> {
    return Promise.reject(
      new KmsError("NOT_IMPLEMENTED", NOT_IMPLEMENTED_MESSAGE),
    );
  }

  /** Encrypt plaintext using a managed key. */
  encrypt(
    _keyId: string,
    _plaintext: Uint8Array,
    _context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    return Promise.reject(
      new KmsError("NOT_IMPLEMENTED", NOT_IMPLEMENTED_MESSAGE),
    );
  }

  /** Decrypt ciphertext using a managed key. */
  decrypt(
    _keyId: string,
    _ciphertext: string,
    _context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    return Promise.reject(
      new KmsError("NOT_IMPLEMENTED", NOT_IMPLEMENTED_MESSAGE),
    );
  }

  /** Sign data using a managed signing key. */
  sign(
    _keyId: string,
    _data: Uint8Array,
    _algorithm?: string,
  ): Promise<KmsSignResult> {
    return Promise.reject(
      new KmsError("NOT_IMPLEMENTED", NOT_IMPLEMENTED_MESSAGE),
    );
  }

  /** Verify a signature against data. */
  verify(
    _keyId: string,
    _data: Uint8Array,
    _signature: string,
    _algorithm?: string,
  ): Promise<boolean> {
    return Promise.reject(
      new KmsError("NOT_IMPLEMENTED", NOT_IMPLEMENTED_MESSAGE),
    );
  }

  /** Rotate a key to a new version. */
  rotateKey(_keyId: string): Promise<KmsKeyMetadata> {
    return Promise.reject(
      new KmsError("NOT_IMPLEMENTED", NOT_IMPLEMENTED_MESSAGE),
    );
  }

  /** Generate a data encryption key (DEK) wrapped by the managed key. */
  generateDataKey(
    _keyId: string,
    _keySpec?: string,
  ): Promise<{
    /** Plaintext data key bytes. */
    plaintext: Uint8Array;
    /** Encrypted (wrapped) data key. */
    ciphertext: string;
  }> {
    return Promise.reject(
      new KmsError("NOT_IMPLEMENTED", NOT_IMPLEMENTED_MESSAGE),
    );
  }
}
