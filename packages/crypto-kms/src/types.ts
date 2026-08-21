// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Metadata associated with a managed key.
 *
 * @example
 * ```ts
 * const meta: KmsKeyMetadata = {
 *   keyId: "arn:aws:kms:us-east-1:123456789:key/abc-123",
 *   algorithm: "aes-256-gcm",
 *   usage: "encrypt",
 *   createdAt: "2026-01-15T10:30:00Z",
 *   enabled: true,
 *   provider: "aws",
 * };
 * ```
 */
export interface KmsKeyMetadata {
  /** Provider-specific key identifier (ARN, resource name, key ID). */
  keyId: string;
  /** Key algorithm (e.g. "aes-256-gcm", "rsa-2048", "ecc-p256"). */
  algorithm: string;
  /** Key usage: "encrypt" | "sign" | "wrap". */
  usage: "encrypt" | "sign" | "wrap";
  /** Creation timestamp (ISO 8601). */
  createdAt: string;
  /** Whether the key is enabled. */
  enabled: boolean;
  /** Provider name (e.g. "aws", "gcp", "azure", "vault", "local"). */
  provider: string;
}

/**
 * Result of a KMS encryption operation.
 *
 * @example
 * ```ts
 * const result: KmsEncryptResult = {
 *   ciphertext: "YmFzZTY0LWVuY29kZWQ=",
 *   keyId: "key-abc-123",
 *   context: { purpose: "user-data" },
 * };
 * ```
 */
export interface KmsEncryptResult {
  /** Base64-encoded ciphertext. */
  ciphertext: string;
  /** Key ID used for encryption. */
  keyId: string;
  /** Provider-specific encryption context. */
  context?: Record<string, string>;
}

/**
 * Result of a KMS decryption operation.
 *
 * @example
 * ```ts
 * const result: KmsDecryptResult = {
 *   plaintext: new Uint8Array([72, 101, 108, 108, 111]),
 *   keyId: "key-abc-123",
 * };
 * ```
 */
export interface KmsDecryptResult {
  /** Decrypted plaintext bytes. */
  plaintext: Uint8Array;
  /** Key ID used for decryption. */
  keyId: string;
}

/**
 * Result of a KMS signing operation.
 *
 * @example
 * ```ts
 * const result: KmsSignResult = {
 *   signature: "c2lnbmF0dXJlLWJ5dGVz",
 *   keyId: "key-abc-123",
 *   algorithm: "RSASSA_PSS_SHA_256",
 * };
 * ```
 */
export interface KmsSignResult {
  /** Base64-encoded signature. */
  signature: string;
  /** Key ID used for signing. */
  keyId: string;
  /** Signing algorithm used. */
  algorithm: string;
}

/**
 * Unified interface for all key management providers.
 *
 * Adapts cloud KMS services (AWS, GCP, Azure, Vault) and local key stores
 * to a single API surface, enabling provider-agnostic key operations.
 *
 * @example
 * ```ts
 * async function encryptData(provider: KmsProvider, keyId: string, data: Uint8Array) {
 *   const { ciphertext } = await provider.encrypt(keyId, data);
 *   const { plaintext } = await provider.decrypt(keyId, ciphertext);
 *   return plaintext;
 * }
 * ```
 */
export interface KmsProvider {
  /** Provider name identifier. */
  readonly name: string;

  /** List all managed keys matching optional filters. */
  listKeys(filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]>;

  /** Retrieve metadata for a specific key. */
  getKey(keyId: string): Promise<KmsKeyMetadata>;

  /** Create a new managed key. */
  createKey(
    algorithm: string,
    usage: "encrypt" | "sign" | "wrap",
    metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata>;

  /** Enable a disabled key. */
  enableKey(keyId: string): Promise<void>;

  /** Disable a key (soft delete). */
  disableKey(keyId: string): Promise<void>;

  /** Schedule a key for deletion. */
  scheduleKeyDeletion(keyId: string, pendingWindowDays?: number): Promise<void>;

  /** Encrypt plaintext with a managed key. */
  encrypt(
    keyId: string,
    plaintext: Uint8Array,
    context?: Record<string, string>,
  ): Promise<KmsEncryptResult>;

  /** Decrypt ciphertext with a managed key. */
  decrypt(
    keyId: string,
    ciphertext: string,
    context?: Record<string, string>,
  ): Promise<KmsDecryptResult>;

  /** Sign data with a managed signing key. */
  sign(
    keyId: string,
    data: Uint8Array,
    algorithm?: string,
  ): Promise<KmsSignResult>;

  /** Verify a signature against data. */
  verify(
    keyId: string,
    data: Uint8Array,
    signature: string,
    algorithm?: string,
  ): Promise<boolean>;

  /** Rotate a key (create a new version, mark old as deprecated). */
  rotateKey(keyId: string): Promise<KmsKeyMetadata>;

  /** Generate a data encryption key (DEK) wrapped by the managed key. */
  generateDataKey(
    keyId: string,
    keySpec?: string,
  ): Promise<{
    /** Plaintext data key bytes. */
    plaintext: Uint8Array;
    /** Encrypted (wrapped) data key. */
    ciphertext: string;
  }>;
}
