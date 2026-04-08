/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as openpgp from "openpgp";
import * as types from "../types/types";

/**
 * ### verify
 *
 * Verifies a signed message against the supplied public key(s).
 *
 * @param data                    - Verification parameters.
 * @param data.message            - Plaintext message to be verified.
 * @param data.verificationKeys   - Base64-encoded armored public key used
 *                                  to verify signatures.
 * @param data.date               - Optional date used for verification
 *                                  instead of the current time.
 * @returns {Promise<openpgp.VerifyMessageResult<string>>} - Verification
 *                                                           result.
 */
export const verify = async (data: types.dataVerify) => {
  const { message, verificationKeys, date } = data;

  const keyInput = Array.isArray(verificationKeys) ? verificationKeys[0]! : verificationKeys;
  const publicKey = Buffer.from(keyInput, "base64").toString("latin1");

  return openpgp.verify({
    message: await openpgp.createMessage({ text: message }),
    verificationKeys: await openpgp.readKey({ armoredKey: publicKey }),
    date,
  });
};

export default verify;
