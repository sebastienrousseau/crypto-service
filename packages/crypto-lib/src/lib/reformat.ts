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
 * ### reformat
 *
 * Reformats signature packets for the shipped key and persists the
 * reformatted material. The previous implementation called
 * `.toString()` on a `WriteStream`, writing the literal string
 * `"[object Object]"` to disk — the actual reformatted key was never
 * persisted.
 *
 * @public
 * @param {Object} data              - Reformat parameters.
 * @param {String} data.email        - New user email.
 * @param {String} data.name         - New user name.
 * @param {String} data.passphrase   - Passphrase that unlocks the private key.
 * @param {Number} data.expiration   - New key expiration time in seconds.
 * @returns {Promise<unknown>}       - The result of `openpgp.reformatKey`.
 */
export const reformat = async (data: types.dataReformat) => {
  const { expiration, passphrase } = data;

  const { privateKeyArmored } = await loadKeystore();
  const privateKey = await unlockPrivateKey(privateKeyArmored, passphrase);

  const reformatted = await openpgp.reformatKey({
    privateKey,
    userIDs: [{ name: data.name, email: data.email }],
    passphrase,
    keyExpirationTime: expiration,
    date: new Date(),
    format: "armored",
  });

  const pubArmored = reformatted.publicKey as string;
  const privArmored = reformatted.privateKey as string;

  const keyDir =
    process.env["CRYPTO_KEY_DIR"] ?? path.resolve(__dirname, "..", "key");
  await Promise.all([
    writeFile(path.join(keyDir, "rsa-reformat.pub"), pubArmored, "utf8"),
    writeFile(path.join(keyDir, "rsa-reformat.key"), privArmored, "utf8"),
    /* c8 ignore next -- revocationCertificate is always a string from reformatKey */
    writeFile(
      path.join(keyDir, "rsa-reformat.cert"),
      reformatted.revocationCertificate ?? "",
      "utf8",
    ),
  ]);

  return reformatted;
};

export default reformat;
