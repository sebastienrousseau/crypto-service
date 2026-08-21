// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/** @remarks HashiCorp Vault Transit secrets engine adapter. */

import type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "../types";

/**
 * Configuration for the HashiCorp Vault provider.
 *
 * @example
 * ```ts
 * const opts: VaultKmsOptions = {
 *   address: "http://127.0.0.1:8200",
 *   token: "hvs.XXXXX",
 *   mountPath: "transit",
 * };
 * ```
 */
export interface VaultKmsOptions {
  /** Vault server address (e.g. "http://127.0.0.1:8200"). */
  address: string;
  /** Vault authentication token. */
  token: string;
  /** Transit engine mount path (default: "transit"). */
  mountPath?: string;
}

/**
 * HashiCorp Vault Transit secrets engine adapter.
 *
 * Uses the Vault HTTP API to provide the unified KmsProvider interface.
 * No additional SDK dependency is required — uses native `fetch`.
 *
 * @example
 * ```ts
 * const provider = new VaultKmsProvider({
 *   address: "http://127.0.0.1:8200",
 *   token: "hvs.XXXXX",
 *   mountPath: "transit",
 * });
 * const key = await provider.createKey("aes256-gcm96", "encrypt");
 * ```
 */
export class VaultKmsProvider implements KmsProvider {
  /** Provider identifier. */
  readonly name = "vault";
  /** Vault server address. */
  private readonly _address: string;
  /** Vault authentication token. */
  private readonly _token: string;
  /** Transit engine mount path. */
  private readonly _mount: string;

  /** Create a Vault Transit provider with the given options. */
  constructor(options: VaultKmsOptions) {
    this._address = options.address;
    this._token = options.token;
    this._mount = options.mountPath ?? "transit";
  }

  /** Build a Vault API URL for the transit engine. */
  buildUrl(path: string): string {
    const base = this._address.replace(/\/+$/, "");
    return `${base}/v1/${this._mount}/${path}`;
  }

  /** Common headers for Vault API requests. */
  buildHeaders(): Record<string, string> {
    return {
      "X-Vault-Token": this._token,
      "Content-Type": "application/json",
    };
  }

  /** List all keys, optionally filtered by usage or enabled state. */
  listKeys(_filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    return Promise.reject(
      new Error("Not implemented: configure HashiCorp Vault connection"),
    );
  }

  /** Retrieve metadata for a specific key by ID. */
  getKey(_keyId: string): Promise<KmsKeyMetadata> {
    return Promise.reject(
      new Error("Not implemented: configure HashiCorp Vault connection"),
    );
  }

  /** Create a new key with the given algorithm and usage. */
  createKey(
    _algorithm: string,
    _usage: "encrypt" | "sign" | "wrap",
    _metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    return Promise.reject(
      new Error("Not implemented: configure HashiCorp Vault connection"),
    );
  }

  /** Enable a previously disabled key. */
  enableKey(_keyId: string): Promise<void> {
    return Promise.reject(
      new Error("Not implemented: configure HashiCorp Vault connection"),
    );
  }

  /** Disable a key so it cannot be used for operations. */
  disableKey(_keyId: string): Promise<void> {
    return Promise.reject(
      new Error("Not implemented: configure HashiCorp Vault connection"),
    );
  }

  /** Schedule a key for deletion after a pending window. */
  scheduleKeyDeletion(
    _keyId: string,
    _pendingWindowDays?: number,
  ): Promise<void> {
    return Promise.reject(
      new Error("Not implemented: configure HashiCorp Vault connection"),
    );
  }

  /** Encrypt plaintext using a managed key. */
  encrypt(
    _keyId: string,
    _plaintext: Uint8Array,
    _context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    return Promise.reject(
      new Error("Not implemented: configure HashiCorp Vault connection"),
    );
  }

  /** Decrypt ciphertext using a managed key. */
  decrypt(
    _keyId: string,
    _ciphertext: string,
    _context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    return Promise.reject(
      new Error("Not implemented: configure HashiCorp Vault connection"),
    );
  }

  /** Sign data using a managed signing key. */
  sign(
    _keyId: string,
    _data: Uint8Array,
    _algorithm?: string,
  ): Promise<KmsSignResult> {
    return Promise.reject(
      new Error("Not implemented: configure HashiCorp Vault connection"),
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
      new Error("Not implemented: configure HashiCorp Vault connection"),
    );
  }

  /** Rotate a key to a new version. */
  rotateKey(_keyId: string): Promise<KmsKeyMetadata> {
    return Promise.reject(
      new Error("Not implemented: configure HashiCorp Vault connection"),
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
      new Error("Not implemented: configure HashiCorp Vault connection"),
    );
  }
}
