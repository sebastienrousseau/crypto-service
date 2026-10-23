/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks X-Wing (draft-connolly-cfrg-xwing-kem-06), the X25519 +
 * ML-KEM-768 KEM IANA's HPKE registry lists as `0x647A`, as HPKE uses it
 * (section 5.6): its shared secret goes to the key schedule directly.
 */

import { ml_kem768_x25519 as xwing } from "@noble/post-quantum/hybrid.js";
import { CryptoError, CryptoErrorCode } from "../errors";

/** A fresh X-Wing key pair: a 32-byte seed and a 1216-byte public key. */
export const xwingKeygen = (): {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
} => xwing.keygen();

/**
 * X-Wing Encap (draft-connolly-cfrg-xwing-kem-06, section 5.6): the KEM's
 * shared secret is X-Wing's own, used directly by the key schedule.
 * `eseed` is the 64 bytes of encapsulation randomness.
 */
export function xwingEncap(
  recipientPub: Uint8Array,
  eseed: Uint8Array,
): { sharedSecret: Uint8Array; enc: Uint8Array } {
  if (recipientPub.length !== 1216) {
    throw new CryptoError(
      "Invalid x-wing public key length (expected 1216 bytes)",
      CryptoErrorCode.INVALID_KEY,
    );
  }
  const { cipherText, sharedSecret } = xwing.encapsulate(recipientPub, eseed);
  return { sharedSecret, enc: cipherText };
}

/** X-Wing Decap with the 32-byte X-Wing private key (a seed). */
export function xwingDecap(
  enc: Uint8Array,
  recipientPriv: Uint8Array,
): Uint8Array {
  if (recipientPriv.length !== 32) {
    throw new CryptoError(
      "Invalid x-wing private key length (expected 32 bytes)",
      CryptoErrorCode.INVALID_KEY,
    );
  }
  if (enc.length !== 1120) {
    throw new CryptoError(
      "Invalid x-wing encapsulated key length (expected 1120 bytes)",
      CryptoErrorCode.INVALID_CIPHERTEXT,
    );
  }
  return xwing.decapsulate(enc, recipientPriv);
}
