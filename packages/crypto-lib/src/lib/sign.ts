/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { writeFile } from "fs/promises";
import * as path from "path";
import * as openpgp from "openpgp";
import { loadKeystore, unlockPrivateKey } from "../key/keystore";
import * as types from "../types/types";

/**
 * ### sign
 *
 * Signs a cleartext message with the configured private key.
 *
 * @public
 * @param {Object} data            - Data to be signed.
 * @param {String} data.message    - Message to be signed.
 * @param {String} data.passphrase - Passphrase that unlocks the private key.
 * @param {Boolean} data.detached  - If true, produces a detached signature.
 * @returns {Promise<String>}      - Armored signed message or detached
 *                                   signature.
 *
 * @async
 * @static
 */
export const sign = async (data: types.dataSign): Promise<string> => {
  const { passphrase, message, detached } = data;

  const { privateKeyArmored } = await loadKeystore();
  const privateKey = await unlockPrivateKey(privateKeyArmored, passphrase);

  // OpenPGP forbids detached signatures over `CleartextMessage`. When the
  // caller asks for a detached signature, use a binary `Message` container
  // instead; otherwise the cleartext framing is preferred for
  // human-readable signed messages.
  const signed = detached
    ? await openpgp.sign({
        message: await openpgp.createMessage({ text: message }),
        signingKeys: privateKey,
        detached: true,
      })
    : await openpgp.sign({
        message: await openpgp.createCleartextMessage({ text: message }),
        signingKeys: privateKey,
      });

  const sigDir = process.env["CRYPTO_DATA_DIR"]
    ?? path.resolve(__dirname, "..", "data");
  await writeFile(
    path.join(sigDir, "signed.sig"),
    signed as string,
    "utf8",
  );

  return signed as string;
};

export default sign;
