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
  /** Provider identifier. */
  readonly name = "gcp";
  /** GCP KMS configuration options. */
  private readonly options: GcpKmsOptions;

  /** Create a GCP KMS provider with the given options. */
  constructor(options: GcpKmsOptions) {
    this.options = options;
  }

  /** Build the parent resource name for the key ring. */
  private getParent(): string {
    return `projects/${this.options.projectId}/locations/${this.options.locationId}/keyRings/${this.options.keyRingId}`;
  }

  /** List all keys, optionally filtered by usage or enabled state. */
  listKeys(_filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    void this.getParent();
    return Promise.reject(
      new Error("Not implemented: install @google-cloud/kms"),
    );
  }

  /** Retrieve metadata for a specific key by ID. */
  getKey(_keyId: string): Promise<KmsKeyMetadata> {
    return Promise.reject(
      new Error("Not implemented: install @google-cloud/kms"),
    );
  }

  /** Create a new key with the given algorithm and usage. */
  createKey(
    _algorithm: string,
    _usage: "encrypt" | "sign" | "wrap",
    _metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    return Promise.reject(
      new Error("Not implemented: install @google-cloud/kms"),
    );
  }

  /** Enable a previously disabled key. */
  enableKey(_keyId: string): Promise<void> {
    return Promise.reject(
      new Error("Not implemented: install @google-cloud/kms"),
    );
  }

  /** Disable a key so it cannot be used for operations. */
  disableKey(_keyId: string): Promise<void> {
    return Promise.reject(
      new Error("Not implemented: install @google-cloud/kms"),
    );
  }

  /** Schedule a key for deletion after a pending window. */
  scheduleKeyDeletion(
    _keyId: string,
    _pendingWindowDays?: number,
  ): Promise<void> {
    return Promise.reject(
      new Error("Not implemented: install @google-cloud/kms"),
    );
  }

  /** Encrypt plaintext using a managed key. */
  encrypt(
    _keyId: string,
    _plaintext: Uint8Array,
    _context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    return Promise.reject(
      new Error("Not implemented: install @google-cloud/kms"),
    );
  }

  /** Decrypt ciphertext using a managed key. */
  decrypt(
    _keyId: string,
    _ciphertext: string,
    _context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    return Promise.reject(
      new Error("Not implemented: install @google-cloud/kms"),
    );
  }

  /** Sign data using a managed signing key. */
  sign(
    _keyId: string,
    _data: Uint8Array,
    _algorithm?: string,
  ): Promise<KmsSignResult> {
    return Promise.reject(
      new Error("Not implemented: install @google-cloud/kms"),
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
      new Error("Not implemented: install @google-cloud/kms"),
    );
  }

  /** Rotate a key to a new version. */
  rotateKey(_keyId: string): Promise<KmsKeyMetadata> {
    return Promise.reject(
      new Error("Not implemented: install @google-cloud/kms"),
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
      new Error("Not implemented: install @google-cloud/kms"),
    );
  }
}
