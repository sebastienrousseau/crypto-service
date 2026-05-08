// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/** @remarks Google Cloud KMS adapter. Requires `@google-cloud/kms` as a peer dependency. */

import type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "../types";

/**
 * Configuration for the Google Cloud KMS provider.
 *
 * @example
 * ```ts
 * const opts: GcpKmsOptions = {
 *   projectId: "my-project",
 *   locationId: "us-east1",
 *   keyRingId: "my-ring",
 * };
 * ```
 */
export interface GcpKmsOptions {
  /** GCP project ID. */
  projectId: string;
  /** KMS location ID (e.g. "us-east1", "global"). */
  locationId: string;
  /** KMS key ring ID. */
  keyRingId: string;
}

/**
 * Google Cloud KMS adapter.
 *
 * Wraps the `@google-cloud/kms` SDK to provide the unified KmsProvider
 * interface. Install `@google-cloud/kms` as a peer dependency.
 *
 * @example
 * ```ts
 * const provider = new GcpKmsProvider({
 *   projectId: "my-project",
 *   locationId: "us-east1",
 *   keyRingId: "my-ring",
 * });
 * const key = await provider.createKey("aes-256-gcm", "encrypt");
 * ```
 */
export class GcpKmsProvider implements KmsProvider {
  readonly name = "gcp";
  private readonly options: GcpKmsOptions;

  constructor(options: GcpKmsOptions) {
    this.options = options;
  }

  /** Build the parent resource name for the key ring. */
  private getParent(): string {
    return `projects/${this.options.projectId}/locations/${this.options.locationId}/keyRings/${this.options.keyRingId}`;
  }

  // TODO: implement with @google-cloud/kms
  async listKeys(_filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    void this.getParent();
    throw new Error("Not implemented: install @google-cloud/kms");
  }

  // TODO: implement with @google-cloud/kms
  async getKey(_keyId: string): Promise<KmsKeyMetadata> {
    throw new Error("Not implemented: install @google-cloud/kms");
  }

  // TODO: implement with @google-cloud/kms
  async createKey(
    _algorithm: string,
    _usage: "encrypt" | "sign" | "wrap",
    _metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    throw new Error("Not implemented: install @google-cloud/kms");
  }

  // TODO: implement with @google-cloud/kms
  async enableKey(_keyId: string): Promise<void> {
    throw new Error("Not implemented: install @google-cloud/kms");
  }

  // TODO: implement with @google-cloud/kms
  async disableKey(_keyId: string): Promise<void> {
    throw new Error("Not implemented: install @google-cloud/kms");
  }

  // TODO: implement with @google-cloud/kms
  async scheduleKeyDeletion(
    _keyId: string,
    _pendingWindowDays?: number,
  ): Promise<void> {
    throw new Error("Not implemented: install @google-cloud/kms");
  }

  // TODO: implement with @google-cloud/kms
  async encrypt(
    _keyId: string,
    _plaintext: Uint8Array,
    _context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    throw new Error("Not implemented: install @google-cloud/kms");
  }

  // TODO: implement with @google-cloud/kms
  async decrypt(
    _keyId: string,
    _ciphertext: string,
    _context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    throw new Error("Not implemented: install @google-cloud/kms");
  }

  // TODO: implement with @google-cloud/kms
  async sign(
    _keyId: string,
    _data: Uint8Array,
    _algorithm?: string,
  ): Promise<KmsSignResult> {
    throw new Error("Not implemented: install @google-cloud/kms");
  }

  // TODO: implement with @google-cloud/kms
  async verify(
    _keyId: string,
    _data: Uint8Array,
    _signature: string,
    _algorithm?: string,
  ): Promise<boolean> {
    throw new Error("Not implemented: install @google-cloud/kms");
  }

  // TODO: implement with @google-cloud/kms
  async rotateKey(_keyId: string): Promise<KmsKeyMetadata> {
    throw new Error("Not implemented: install @google-cloud/kms");
  }

  // TODO: implement with @google-cloud/kms
  async generateDataKey(
    _keyId: string,
    _keySpec?: string,
  ): Promise<{
    /** Plaintext data key bytes. */
    plaintext: Uint8Array;
    /** Encrypted (wrapped) data key. */
    ciphertext: string;
  }> {
    throw new Error("Not implemented: install @google-cloud/kms");
  }
}
