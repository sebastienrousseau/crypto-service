/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as openpgp from "openpgp";
import * as types from "../types/types";

/**
 * ### session
 *
 * Generate a new session key object, taking the algorithm preferences
 * of the passed public key into account.
 *
 * @public
 * @param {Object} data               - Data used to generate session key.
 * @param {String} data.email         - User email.
 * @param {String} data.name          - User name.
 * @param {String} data.publicKey     - Base64-encoded armored public key.
 *
 * @returns {Promise<openpgp.SessionKey>} - Session key object.
 */
export const session = async (
  data: types.dataSessionKey,
): Promise<openpgp.SessionKey> => {
  const publicKeyArmored = Buffer.from(data.publicKey, "base64").toString("latin1");
  const encryptionKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

  return openpgp.generateSessionKey({
    encryptionKeys: encryptionKey,
    date: new Date(),
    encryptionUserIDs: [{ name: data.name, email: data.email }],
    config: {
      preferredHashAlgorithm: 8,           // SHA-256
      preferredSymmetricAlgorithm: 9,      // AES-256
      preferredCompressionAlgorithm: 1,    // ZIP
      minRSABits: 2048,
    },
  });
};

export default session;
