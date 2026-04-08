/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as openpgp from "openpgp";
import { unlockPrivateKey } from "../key/keystore";
import * as types from "../types/types";

/**
 * ### encrypt
 *
 * Encrypts a message using public keys, passwords or both at once.
 * At least one of `encryptionKeys` or `passwords` must be specified.
 * If signing keys are specified, those will be used to sign the message.
 *
 * @public
 * @param {Object} data           - Data to be encrypted.
 * @param {String} passphrase     - Passphrase used to unlock the signing
 *                                  private key, when one is provided.
 * @param {String} message        - Message to be encrypted.
 * @param {String} publicKey      - Public key (base64-encoded armored
 *                                  block) used to encrypt the message.
 * @param {String} privateKey     - Optional private key (base64-encoded
 *                                  armored block) used for signing.
 * @returns {Promise<String>}     - Encrypted message as an armored string.
 *
 * @async
 * @static
 */
export const encrypt = async (data: types.dataEncrypt): Promise<string> => {
  const { message, passphrase, publicKey: publicKeyBase64, privateKey: privateKeyBase64 } = data;

  const publicKeyArmored = Buffer.from(publicKeyBase64, "base64").toString("latin1");
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

  const pgpMessage = await openpgp.createMessage({ text: message });
  const encryptOptions = {
    message: pgpMessage,
    encryptionKeys: publicKey,
  } as Parameters<typeof openpgp.encrypt>[0];

  if (privateKeyBase64) {
    const privateKeyArmored = Buffer.from(privateKeyBase64, "base64").toString("latin1");
    encryptOptions.signingKeys = await unlockPrivateKey(privateKeyArmored, passphrase);
  }

  const encrypted = await openpgp.encrypt(encryptOptions);
  return encrypted as unknown as string;
};

export default encrypt;
