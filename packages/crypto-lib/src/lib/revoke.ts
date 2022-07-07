import * as fs from "fs";
import path from "path";
import * as openpgp from "openpgp";
import * as key from "../key/key";
import * as types from "../types/types";

const args = process.argv.slice(2);

/**
 * ### revoke
 *
 * Revokes the Public and Private key pair.
 *
 * @public
 * @param {Object} data - Data to be revoked.
 * @param {String} data.passphrase - Passphrase enumeration.
 * @param {String} data.flag - Flag enumeration.
 * @param {String} data.reason - Reason for revocation.
 *
 * @returns {Promise<String>} - Revoked key pair.
 *
 * @example
 * ```javascript
 * import { revoke } from "crypto-lib";
 *
 * const data = {
 *   passphrase: "passphrase",
 *   flag: flag, // optional
 *   reason: "reason" // optional
 * };
 * revoke(data).then(publicKey => {
 *   console.log(publicKey);
 * }
 * .catch(err => {
 *   console.log(err);
 * }
 * ```
 *
 */
export const revoke = async (data: types.dataRevoke) => {
  const flag = data.flag; // optional
  const passphrase = data.passphrase;
  const reason = data.reason; // optional

  const privateKeyRead = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({
      armoredKey: key.PrivateKey,
    }),
    passphrase,
  });

  const revokeKey = await openpgp.revokeKey({
    date: new Date(), // revocation date
    key: privateKeyRead, // private key object
    reasonForRevocation: { flag: flag, string: reason }, // optional, default: 0
  });

  console.log(revokeKey);

  const revokePubKey = await fs.createWriteStream(
    path.resolve(__dirname, "../key/rsa-revoke.pub"),
    { encoding: "utf8" },
  );
  const revokePubKeyString = revokePubKey.toString();
  revokePubKey.write(Buffer.from(revokePubKeyString).toString("base64"));
  revokePubKey.on("finish", () => {
    console.log("✅ Wrote revoke public key data to file");
  });
  revokePubKey.end();

  const revokePrivKey = await fs.createWriteStream(
    path.resolve(__dirname, "../key/rsa-revoke.key"),
    { encoding: "utf8" },
    );
    const revokePrivateKeyString = revokePrivKey.toString();
    revokePrivKey.write(Buffer.from(revokePrivateKeyString).toString("base64"));
    revokePrivKey.on("finish", () => {
      console.log("✅ Wrote revoke private key data to file");
    });
    revokePrivKey.end();

  return revokeKey;
};

if (args instanceof Array && args.length) {
  const data = {
    flag: Number(args[1]), // optional
    passphrase: args[3],
    reason: args[5], // optional
  };
  revoke(data);
}
export default revoke;

//# sourceMappingURL=revoke.js.map
// Language: typescript
