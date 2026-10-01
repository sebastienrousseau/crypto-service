/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Configuration for column-level encryption.
 *
 * @example
 * ```ts
 * const config: EncryptionConfig = {
 *   key: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
 *   algorithm: "xchacha20-poly1305",
 * };
 * ```
 */
export interface EncryptionConfig {
  /**
   * 256-bit key as a 64-character hex string. New values are sealed
   * under a subkey derived from it with HKDF-SHA-256; the key itself is
   * used only to read legacy (pre-`v2`) ciphertexts.
   */
  key: string;

  /**
   * Algorithm identifier. Currently only `"xchacha20-poly1305"` is supported.
   * Reserved for future algorithm additions.
   *
   * @default "xchacha20-poly1305"
   */
  algorithm?: string;

  /**
   * Per-entity field mapping. Keys are entity names, values are arrays of
   * property names that should be encrypted. Used by `EncryptionSubscriber`
   * to know which fields to process automatically.
   *
   * @example
   * ```ts
   * fields: new Map([
   *   ["User", ["ssn", "email"]],
   *   ["Payment", ["cardNumber"]],
   * ])
   * ```
   */
  fields?: Map<string, string[]>;

  /**
   * Column context bound into every ciphertext as associated data, by
   * convention `"Entity.property"`. A value sealed for one context fails
   * to decrypt under another, so ciphertexts cannot be swapped between
   * columns. `@EncryptedColumn` sets it to `ClassName.property` unless
   * given here; `EncryptionSubscriber` always uses `EntityName.field`.
   * A bare `EncryptionTransformer` without a context binds the empty
   * context, which every other context-less transformer shares.
   *
   * @default ""
   */
  context?: string;

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
   * every row has been re-written.
   *
   * @default true
   */
  acceptLegacyCiphertext?: boolean;
}
