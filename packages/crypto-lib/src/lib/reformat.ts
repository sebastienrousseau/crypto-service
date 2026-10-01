/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as openpgp from "openpgp";
import { writeKeyOutputs } from "./key-output";
import { loadKeystore, unlockPrivateKey } from "../key/keystore";
import * as types from "../types/types";

/**
 * The armoured key material `openpgp.reformatKey` / `revokeKey` return.
 *
 * Declared here rather than inferred: openpgp 6 types these as
 * `SerializedKeyPair<string> & { revocationCertificate: string }`, and
 * `SerializedKeyPair` is not exported from the package root, so TypeScript
 * cannot name it in the emitted declarations (TS4023/TS4058). Both calls
 * pass `format: "armored"`, so every field is a string.
 */
export interface ArmoredKeyResult {
  publicKey: string;
  privateKey: string;
  /**
   * Present for `reformatKey`, absent for `revokeKey` — revoking a key
   * produces no new certificate, the key itself carries the revocation.
   */
  revocationCertificate?: string;
}

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
export const reformat = async (
  data: types.dataReformat,
): Promise<ArmoredKeyResult> => {
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

  await writeKeyOutputs([
    { name: "rsa-reformat.pub", content: pubArmored, secret: false },
    { name: "rsa-reformat.key", content: privArmored, secret: true },
    {
      name: "rsa-reformat.cert",
      content: reformatted.revocationCertificate,
      secret: false,
    },
  ]);

  return reformatted;
};

/** Default export of the reformat function. */
export default reformat;
