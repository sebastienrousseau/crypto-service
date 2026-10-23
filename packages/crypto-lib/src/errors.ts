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
  /** A token is malformed, expired, not yet valid or issued in the future. */
  INVALID_TOKEN: "INVALID_TOKEN",
  /** The operation is not possible in the object's current state. */
  INVALID_STATE: "INVALID_STATE",
  /** crypto-lib's environment is configured wrongly (not the caller's input). */
  CONFIGURATION: "CONFIGURATION",
} as const;

/** Error codes of the OPAQUE protocol (RFC 9807), in `protocols.opaque`. */
export const OpaqueErrorCode = {
  /** RFC 9807 EnvelopeRecoveryError: wrong password or a forged or fake credential response. */
  ENVELOPE_RECOVERY: "OPAQUE_ENVELOPE_RECOVERY",
  /** RFC 9807 ServerAuthenticationError: the server MAC in KE2 does not verify. */
  SERVER_AUTHENTICATION: "OPAQUE_SERVER_AUTHENTICATION",
  /** RFC 9807 ClientAuthenticationError: the client MAC in KE3 does not verify. */
  CLIENT_AUTHENTICATION: "OPAQUE_CLIENT_AUTHENTICATION",
  /** A message, key or element has the wrong length or is not a valid group element. */
  DESERIALIZE: "OPAQUE_DESERIALIZE",
  /** An input outside the RFC's limits (unknown suite, empty or oversized identity). */
  INVALID_INPUT: "OPAQUE_INVALID_INPUT",
} as const;

/** Codes for faults on crypto-lib's side, not caused by the caller's input. */
const LIBRARY_FAULT_CODES: ReadonlySet<string> = new Set([
  CryptoErrorCode.BUFFER_DESTROYED,
  CryptoErrorCode.CONFIGURATION,
]);

/** Codes for errors the caller's input caused. */
const CALLER_ERROR_CODES: ReadonlySet<string> = new Set(
  [...Object.values(CryptoErrorCode), ...Object.values(OpaqueErrorCode)].filter(
    (code) => !LIBRARY_FAULT_CODES.has(code),
  ),
);

/**
 * Whether a `CryptoError` code means the caller's input was at fault (bad
 * input, a failed authentication or signature check, an expired token),
 * as opposed to a fault on crypto-lib's side. A server answers the first
 * with a 4xx and the second with a 5xx. Unknown codes are not caller
 * errors.
 *
 * @example
 * ```ts
 * if (err instanceof CryptoError && isCallerErrorCode(err.code)) reply400();
 * ```
 */
export function isCallerErrorCode(code: string): boolean {
  return CALLER_ERROR_CODES.has(code);
}
