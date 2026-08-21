/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Branded error class for all crypto-lib operations.
 *
 * Allows consumers to catch library-specific errors distinctly from
 * other runtime errors using `instanceof CryptoError`.
 *
 * @example
 * ```ts
 * import { CryptoError } from "@sebastienrousseau/crypto-lib";
 *
 * try {
 *   crypto.sign("ed25519", invalidKey, message);
 * } catch (err) {
 *   if (err instanceof CryptoError) {
 *     console.error(err.code, err.message);
 *   }
 * }
 * ```
 */
export class CryptoError extends Error {
  /** Machine-readable error code (e.g., "INVALID_KEY", "UNSUPPORTED_ALGORITHM"). */
  public readonly code: string;

  /**
   * Create a new CryptoError.
   *
   * @param message - Human-readable error description.
   * @param code - Machine-readable error code.
   *
   * @example
   * ```ts
   * throw new CryptoError("Key must be 32 bytes", "INVALID_KEY_LENGTH");
   * ```
   */
  constructor(message: string, code: string) {
    super(message);
    this.name = "CryptoError";
    this.code = code;
  }
}

/** Error codes used by crypto-lib. */
export const CryptoErrorCode = {
  /** The provided key has an invalid length or format. */
  INVALID_KEY: "INVALID_KEY",
  /** The algorithm is not supported. */
  UNSUPPORTED_ALGORITHM: "UNSUPPORTED_ALGORITHM",
  /** The hex string is malformed. */
  INVALID_HEX: "INVALID_HEX",
  /** The ciphertext is too short or corrupted. */
  INVALID_CIPHERTEXT: "INVALID_CIPHERTEXT",
  /** Authentication tag verification failed. */
  AUTH_FAILED: "AUTH_FAILED",
  /** The buffer has been destroyed and cannot be accessed. */
  BUFFER_DESTROYED: "BUFFER_DESTROYED",
  /** A required parameter is missing or invalid. */
  INVALID_INPUT: "INVALID_INPUT",
} as const;
