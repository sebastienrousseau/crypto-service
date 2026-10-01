// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Configuration for encrypted fields in a Prisma model.
 *
 * @example
 * ```ts
 * const field: FieldConfig = {
 *   model: "User",
 *   fields: ["email", "ssn", "phone"],
 * };
 * ```
 */
export interface FieldConfig {
  /** The model name (e.g. "User", "Patient"). */
  model: string;
  /** Fields to encrypt (e.g. ["email", "ssn", "phone"]). */
  fields: string[];
}

/**
 * Configuration for the encryption middleware.
 *
 * @example
 * ```ts
 * const config: EncryptionConfig = {
 *   key: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
 *   encryptedFields: [{ model: "User", fields: ["email", "phone"] }],
 *   algorithm: "xchacha20-poly1305",
 *   deterministicFields: ["email"],
 * };
 * ```
 */
export interface EncryptionConfig {
  /** Hex-encoded 256-bit encryption key. */
  key: string;
  /** Models and fields to encrypt. */
  encryptedFields: FieldConfig[];
  /**
   * Encryption algorithm. Only `"xchacha20-poly1305"` is implemented;
   * the option is accepted for forward compatibility and currently has
   * no effect.
   */
  algorithm?: "xchacha20-poly1305" | "aes-256-gcm";
  /**
   * Fields stored as an HMAC-SHA-256 blind index instead of ciphertext,
   * so they can be matched exactly in `where` clauses. Reads return the
   * stored MAC, not the plaintext: the blind index is one-way.
   */
  deterministicFields?: string[];
  /**
   * Return a stored value as-is when it is not a ciphertext at all,
   * instead of throwing a `FieldDecryptionError`. Meant only for the
   * window in which existing plaintext rows are being migrated. A value
   * in the `v2:` format that fails authentication is always rejected.
   *
   * @default false
   */
  allowPlaintextFallback?: boolean;
  /**
   * Accept legacy ciphertexts written before the `v2:` format (sealed
   * with the configured key and no associated data). Turn this off once
   * every row has been re-written, so that legacy values, which are not
   * bound to their model and field, can no longer be swapped in.
   *
   * @default true
   */
  acceptLegacyCiphertext?: boolean;
  /**
   * Key used for the blind index of `deterministicFields`.
   *
   * - `"legacy"`: HMAC with the configured key, as in earlier versions,
   *   so existing index values keep matching.
   * - `"hkdf"`: HMAC with a subkey derived by HKDF-SHA-256
   *   (info `crypto-prisma/bidx/v1`). Every stored index value must be
   *   recomputed when switching an existing database to this mode.
   *
   * @default "legacy"
   */
  blindIndexKeyDerivation?: "legacy" | "hkdf";
}
