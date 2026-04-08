/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as openpgp from "openpgp";
import { unlockPrivateKey } from "../key/keystore";
import * as types from "../types/types";

/**
 * ### decrypt
 *
 * Decrypts a message with the user's private key, a session key or a password.
 * One of `decryptionKeys`, `sessionkeys` or `passwords` must be specified
 * (passing a combination of these options is not supported).
 *
 * @public
 * @param {Object} data                     - Data to be decrypted.
 * @param {String} data.passphrase          - Passphrase used to unlock the
 *                                            private decryption key.
 * @param {String} data.message             - Encrypted message, base64-
 *                                            encoded armored block.
 * @param {String} data.publicKey           - Public key used for signature
 *                                            verification (base64-encoded
 *                                            armored block).
 * @param {String} data.privateKey          - Private key used for
 *                                            decryption (base64-encoded
 *                                            armored block).
 * @returns {Promise<{data, signatureValid}>}  - The decrypted message body
 *                                                and a boolean indicating
 *                                                whether the signature (if
 *                                                any) verified.
 */
export const decrypt = async (
  data: types.dataDecrypt,
): Promise<{ data: string; signatureValid: boolean }> => {
  const { message: encryptedMessage, passphrase, publicKey: publicKeyBase64, privateKey: privateKeyBase64 } = data;

  if (!privateKeyBase64) {
    throw new Error("Private key is required for decryption");
  }

  const message = await openpgp.readMessage({
    armoredMessage: Buffer.from(encryptedMessage, "base64").toString("latin1"),
  });

  const publicKeyArmored = Buffer.from(publicKeyBase64, "base64").toString("latin1");
  const privateKeyArmored = Buffer.from(privateKeyBase64, "base64").toString("latin1");

  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
  const privateKey = await unlockPrivateKey(privateKeyArmored, passphrase);

  const { data: decrypted, signatures } = await openpgp.decrypt({
    message,
    verificationKeys: publicKey,
    decryptionKeys: privateKey,
  });

  let signatureValid = false;
  if (signatures.length > 0) {
    try {
      await signatures[0]!.verified;
      signatureValid = true;
    } catch {
      signatureValid = false;
    }
  }

  return {
    data: decrypted as string,
    signatureValid,
  };
};

export default decrypt;
