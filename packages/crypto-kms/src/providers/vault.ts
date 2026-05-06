// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/** @file HashiCorp Vault Transit secrets engine adapter. */

import type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "../types";

/** Configuration for the HashiCorp Vault provider. */
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
  readonly name = "vault";
  private readonly _address: string;
  private readonly _token: string;
  private readonly _mount: string;

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

  // TODO: implement with Vault HTTP API
  async listKeys(_filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    throw new Error("Not implemented: configure HashiCorp Vault connection");
  }

  // TODO: implement with Vault HTTP API
  async getKey(_keyId: string): Promise<KmsKeyMetadata> {
    throw new Error("Not implemented: configure HashiCorp Vault connection");
  }

  // TODO: implement with Vault HTTP API
  async createKey(
    _algorithm: string,
    _usage: "encrypt" | "sign" | "wrap",
    _metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    throw new Error("Not implemented: configure HashiCorp Vault connection");
  }

  // TODO: implement with Vault HTTP API
  async enableKey(_keyId: string): Promise<void> {
    throw new Error("Not implemented: configure HashiCorp Vault connection");
  }

  // TODO: implement with Vault HTTP API
  async disableKey(_keyId: string): Promise<void> {
    throw new Error("Not implemented: configure HashiCorp Vault connection");
  }

  // TODO: implement with Vault HTTP API
  async scheduleKeyDeletion(
    _keyId: string,
    _pendingWindowDays?: number,
  ): Promise<void> {
    throw new Error("Not implemented: configure HashiCorp Vault connection");
  }

  // TODO: implement with Vault HTTP API
  async encrypt(
    _keyId: string,
    _plaintext: Uint8Array,
    _context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    throw new Error("Not implemented: configure HashiCorp Vault connection");
  }

  // TODO: implement with Vault HTTP API
  async decrypt(
    _keyId: string,
    _ciphertext: string,
    _context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    throw new Error("Not implemented: configure HashiCorp Vault connection");
  }

  // TODO: implement with Vault HTTP API
  async sign(
    _keyId: string,
    _data: Uint8Array,
    _algorithm?: string,
  ): Promise<KmsSignResult> {
    throw new Error("Not implemented: configure HashiCorp Vault connection");
  }

  // TODO: implement with Vault HTTP API
  async verify(
    _keyId: string,
    _data: Uint8Array,
    _signature: string,
    _algorithm?: string,
  ): Promise<boolean> {
    throw new Error("Not implemented: configure HashiCorp Vault connection");
  }

  // TODO: implement with Vault HTTP API
  async rotateKey(_keyId: string): Promise<KmsKeyMetadata> {
    throw new Error("Not implemented: configure HashiCorp Vault connection");
  }

  // TODO: implement with Vault HTTP API
  async generateDataKey(
    _keyId: string,
    _keySpec?: string,
  ): Promise<{ plaintext: Uint8Array; ciphertext: string }> {
    throw new Error("Not implemented: configure HashiCorp Vault connection");
  }
}
