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
 * ### revoke
 *
 * Produces a revocation for the shipped key pair and persists the
 * revoked key material to disk. The previous implementation called
 * `.toString()` on a `WriteStream`, which wrote the literal string
 * `"[object Object]"` to disk — the real key was never persisted.
 *
 * @public
 * @param {Object} data            - Revocation parameters.
 * @param {String} data.passphrase - Passphrase that unlocks the private key.
 * @param {Number} data.flag       - Optional revocation reason flag.
 * @param {String} data.reason     - Optional human-readable reason.
 * @returns {Promise<unknown>}     - The result of `openpgp.revokeKey`.
 */
export const revoke = async (data: types.dataRevoke) => {
  const { flag, passphrase, reason } = data;

  const { privateKeyArmored } = await loadKeystore();
  const privateKey = await unlockPrivateKey(privateKeyArmored, passphrase);

  const revoked = await openpgp.revokeKey({
    date: new Date(),
    key: privateKey,
    reasonForRevocation: { flag, string: reason },
    format: "armored",
  });

  const revokedPubArmored = revoked.publicKey as unknown as string;
  const revokedPrivArmored = revoked.privateKey as unknown as string;

  const keyDir = process.env["CRYPTO_KEY_DIR"]
    ?? path.resolve(__dirname, "..", "key");
  await Promise.all([
    writeFile(path.join(keyDir, "rsa-revoke.pub"), revokedPubArmored, "utf8"),
    writeFile(path.join(keyDir, "rsa-revoke.key"), revokedPrivArmored, "utf8"),
  ]);

  return revoked;
};

export default revoke;
