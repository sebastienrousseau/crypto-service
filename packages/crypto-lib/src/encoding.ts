/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks The one hex check every crypto-lib input goes through.
 *
 * `Buffer.from(hex, "hex")` stops at the first character that is not hex
 * and drops a trailing odd nibble, so a lax check let "abc" become one
 * byte and "zz" become none. A string is hex here only if it is all hex
 * digits and has an even length.
 */

import { CryptoError, CryptoErrorCode } from "./errors";

/** Hex digits only. */
const HEX_DIGITS = /^[0-9a-fA-F]*$/;

/** Whether `value` is hex: hex digits only, an even number of them. */
export function isHex(value: string): boolean {
  return value.length % 2 === 0 && HEX_DIGITS.test(value);
}

/**
 * Decodes hex, refusing anything {@link isHex} rejects with a CryptoError
 * `INVALID_HEX`.
 */
export function decodeHex(value: string): Uint8Array {
  if (!isHex(value)) {
    throw new CryptoError("Invalid hex string", CryptoErrorCode.INVALID_HEX);
  }
  return Buffer.from(value, "hex");
}
