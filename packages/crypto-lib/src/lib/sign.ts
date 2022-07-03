import { writeFile } from "fs/promises";
import * as key from "../key/key";
import * as openpgp from "openpgp";
import * as types from "../types/types";

const args = process.argv.slice(2);

/**
 * ### sign
 *
 * Signs and verifies cleartext messages with a private key.
 *
 * @public
 * @param {Object} data            - Data to be signed.
 * @param {String} data.message    - Message to be signed.
 * @param {String} data.passphrase - Array of passwords or a single password to
 *                                   encrypt the message.
 * @param {String} data.detached   - If true the return value should contain a
 *                                   detached signature.
 * @returns {Promise<String>}      - Signed message (string if `armor` was true,
 *                                   the default; Uint8Array if `armor` was
 *                                   false).
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

export const sign = async (data: types.dataSign) => {
  const passphrase = data.passphrase;
  const message = data.message;
  const detached = data.detached;
  const unsignedMessage = await openpgp.createCleartextMessage({
    text: message,
  });

  const privateKeyRead = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({
      armoredKey: key.PrivateKey,
    }),
    passphrase,
  });

  const signOptions: openpgp.SignOptions = {
    detached: detached,
    message: unsignedMessage,
    signingKeys: privateKeyRead,
  };

  const signed = await openpgp.sign(
    signOptions && {
      message: unsignedMessage,
      signingKeys: privateKeyRead,
    },
  );

  console.log(signed);
  const signedMsg = await writeFile(
    "./src/data/signed.sig",
    Buffer.from(signed.toString()).toString("base64"),
  );
  signedMsg;
  return signed;
};

if (args instanceof Array && args.length) {
  const data = {
    passphrase: args[1],
    message: args[3],
    detached: Boolean(args[5]),
    publicKey: args[7],
    privateKey: args[9],
  };
  sign(data);
}

export default sign;
