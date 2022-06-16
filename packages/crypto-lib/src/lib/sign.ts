import * as openpgp from "openpgp";
import * as key from "../key/key";

const args = process.argv.slice(2);

/**
 * ### sign
 *
 * Signs a message with a private key.
 *
 * @public
 * @param {Object} data - Data to be signed.
 * @param {String} data.message - Message to be signed.
 * @param {String} data.passphrase - Passphrase enumeration.
 * @param {String} data.unsignedMessage - Unsigned message.
 *
 * @returns {Promise<String>} - Signed message.
 *
 * @async
 * @static
 *
 * @example
 * ```javascript
 * import { sign } from "crypto-lib";
 *
 * const data = {
 *    passphrase: "passphrase",
 *    message: "message",
 *    unsignedMessage: "unsigned message"
 * };
 * sign(data).then(signedMessage => {
 * console.log(signedMessage);
 * }
 * .catch(err => {
 * console.log(err);
 * }
 * ```
 *
 */

export const sign = async (data: { passphrase: string; message: string; }) => {
  const message = data.message;
  const passphrase = data.passphrase;
  const unsignedMessage = await openpgp.createCleartextMessage({ text: message });

  const privateKeyRead = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey(
      {
        armoredKey: key.PrivateKey
      }
    ),
    passphrase,
  });

  const signed = await openpgp.sign({
    message: unsignedMessage,
    signingKeys: privateKeyRead,
  });

  console.log(signed);
  return signed;
};

if (args instanceof Array && args.length) {
  const data = {
    passphrase: args[1],
    message: args[3],
    publicKey: args[5],
    privateKey: args[7],
  };
  sign(data);
}

export default sign;

