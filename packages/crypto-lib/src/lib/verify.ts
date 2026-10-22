/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as openpgp from "openpgp";
import * as types from "../types/types";

/** The outcome of {@link verify}. */
export interface PgpVerifyResult {
  /**
   * True when the input carries at least one signature and every one
   * verifies against the given keys at `date`.
   */
  verified: boolean;
  /** The signed text. */
  data: string;
  /** Hex key IDs of the signatures found, verified or not. */
  keyIDs: string[];
}

/** Decodes a base64-encoded armored block. */
const unbase64 = (value: string): string =>
  Buffer.from(value, "base64").toString("latin1");

/** Reads the clear-signed message, or the text and its detached signature. */
async function signedInput(data: types.dataVerify) {
  if (data.signature !== undefined) {
    return {
      message: await openpgp.createMessage({ text: data.message }),
      signature: await openpgp.readSignature({
        armoredSignature: unbase64(data.signature),
      }),
    };
  }
  return {
    message: await openpgp.readCleartextMessage({
      cleartextMessage: data.message,
    }),
  };
}

/**
 * ### verify
 *
 * Verifies a clear-signed message, or a message and its detached
 * signature, against the supplied public keys.
 *
 * @param data                    - Verification parameters.
 * @param data.message            - An armored clear-signed message (as
 *                                  `sign` returns without `detached`), or
 *                                  the signed text when `signature` is set.
 * @param data.signature          - Optional base64-encoded armored detached
 *                                  signature over `message`.
 * @param data.verificationKeys   - Base64-encoded armored public key, or
 *                                  several; a signature by any of them
 *                                  counts.
 * @param data.date               - Date used for verification instead of
 *                                  the current time.
 * @returns {Promise<PgpVerifyResult>} - Whether every signature verified.
 * @throws When the message is not clear-signed and no signature is given,
 *         or a key or signature cannot be read.
 */
export const verify = async (
  data: types.dataVerify,
): Promise<PgpVerifyResult> => {
  const keys = [data.verificationKeys].flat();
  const verificationKeys = await Promise.all(
    keys.map((key) => openpgp.readKey({ armoredKey: unbase64(key) })),
  );
  const result = await openpgp.verify({
    ...(await signedInput(data)),
    verificationKeys,
    date: data.date,
  });
  const outcomes = await Promise.all(
    result.signatures.map((s) =>
      s.verified.then(
        () => true,
        () => false,
      ),
    ),
  );
  return {
    verified: outcomes.length > 0 && outcomes.every(Boolean),
    data: result.data as string,
    keyIDs: result.signatures.map((s) => s.keyID.toHex()),
  };
};

/** Default export of the verify function. */
export default verify;
