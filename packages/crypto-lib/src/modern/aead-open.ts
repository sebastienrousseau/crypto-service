/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { CryptoError, CryptoErrorCode } from "../errors";

/** The part of a noble AEAD cipher that opens a sealed message. */
export interface Opener {
  decrypt(sealed: Uint8Array): Uint8Array;
}

/**
 * Open a sealed message, reporting a failed tag check as the caller's
 * error. With the key and nonce lengths already checked, noble's
 * decrypt fails only when the tag does not verify: a wrong key, wrong
 * associated data or a modified ciphertext. noble throws a plain Error
 * for it, which callers cannot tell apart from a fault in the library.
 *
 * @throws CryptoError AUTH_FAILED when the tag does not verify.
 */
export function openSealed(cipher: Opener, sealed: Uint8Array): Uint8Array {
  try {
    return cipher.decrypt(sealed);
  } catch {
    throw new CryptoError(
      "Authentication failed: wrong key, wrong associated data or modified ciphertext",
      CryptoErrorCode.AUTH_FAILED,
    );
  }
}
