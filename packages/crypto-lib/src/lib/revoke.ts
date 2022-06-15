import * as openpgp from "openpgp";
import * as key from "../key/key";

const args = process.argv.slice(2);

/**
 * ### revoke
 *
 * Provides a function for asymmetric revocation.
 *
 * @public
 * @param {Object} data - Data to be revoked.
 * @param {String} data.passphrase - Passphrase enumeration.
 * @param {String} data.publicKey - Public key enumeration.
 *
 * @returns {Promise<String>} - Revoked public key.
 *
 * @example
 * ```javascript
 * import { revoke } from "crypto-lib";
 *
 * const data = {
 *  passphrase: "passphrase",
 *  publicKey: "base64 encoded public key"
 * };
 * revoke(data).then(publicKey => {
 *  console.log(publicKey);
 * }
 * .catch(err => {
 *  console.log(err);
 * }
 * ```
 *
*/
const revoke = async (data: { passphrase: string }) => {
  const passphrase = data.passphrase;

  const privateKeyRead = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey(
      {
        armoredKey: key.PrivateKey
      }
    ),
    passphrase,
  });

  const { publicKey: revokedKeyArmored } = await openpgp.revokeKey({
    key: privateKeyRead,
    format: "armored",
  });

  console.log({ publicKey: revokedKeyArmored }); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
  return revokedKeyArmored;
};

if (args instanceof Array && args.length) {
  const data = {
    passphrase: args[1],
  };
  revoke(data);
}
export default revoke;
