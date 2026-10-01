// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Typed error raised by crypto-kms providers.
 */

/**
 * Machine-readable reason for a {@link KmsError}.
 *
 * - `NOT_FOUND`: the key, or the key version named by a ciphertext, does not exist.
 * - `DISABLED`: the key is disabled or scheduled for deletion.
 * - `INVALID_USAGE`: the key's usage does not allow the operation
 *   (for example signing with an encryption key).
 * - `INVALID_ARGUMENT`: an argument is malformed (for example a non-string
 *   encryption-context value) or the request is not allowed
 *   (for example destroying the current key version).
 * - `INVALID_CIPHERTEXT`: the ciphertext is truncated or not in a format
 *   this provider produced.
 * - `DECRYPTION_FAILED`: authentication failed: wrong key, wrong encryption
 *   context, or tampered ciphertext.
 * - `VERSION_DESTROYED`: the ciphertext was produced by a key version whose
 *   material has been destroyed.
 * - `NOT_IMPLEMENTED`: the provider is a stub.
 * - `DEPENDENCY_MISSING`: an optional peer dependency is not installed.
 */
export type KmsErrorCode =
  | "NOT_FOUND"
  | "DISABLED"
  | "INVALID_USAGE"
  | "INVALID_ARGUMENT"
  | "INVALID_CIPHERTEXT"
  | "DECRYPTION_FAILED"
  | "VERSION_DESTROYED"
  | "NOT_IMPLEMENTED"
  | "DEPENDENCY_MISSING";

/**
 * Error raised by crypto-kms providers, carrying a stable {@link KmsErrorCode}.
 *
 * Branch on `code` rather than on the message text, which may change.
 *
 * @example
 * ```ts
 * try {
 *   await kms.decrypt(keyId, ciphertext, context);
 * } catch (err) {
 *   if (err instanceof KmsError && err.code === "DECRYPTION_FAILED") {
 *     // wrong context or tampered ciphertext
 *   }
 *   throw err;
 * }
 * ```
 */
export class KmsError extends Error {
  /** Always `"KmsError"`. */
  override readonly name = "KmsError";
  /** Machine-readable reason. */
  readonly code: KmsErrorCode;
  /** The key the failing operation addressed, when there was one. */
  readonly keyId: string | undefined;

  /** Create a KMS error with a code, a message and the key it concerns. */
  constructor(code: KmsErrorCode, message: string, keyId?: string) {
    super(message);
    this.code = code;
    this.keyId = keyId;
  }
}
