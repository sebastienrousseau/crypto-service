import * as openpgp from "openpgp";
import * as types from "../types/types";

const args = process.argv.slice(2);

/**
 * ### session
 *
 * Generate a new session key object, taking the algorithm preferences of the
 * passed public keys into account.
 *
 * @public
 * @param {Object} data               - Data used to generate session key.
 * @param {String} data.email         - Email enumeration.
 * @param {String} data.name          - Name enumeration.
 * @param {String} data.publicKey     - Public key enumeration base64 encoded.
 *                                      key, used to encrypt the message.
 *                                      This can be an array of keys or single.
 *
 * @returns {Promise<String>} - Object with session key data and algorithm.
 *
 * @example
 * ```javascript
 * import { session } from "crypto-lib";
 *
 * const data = {
 * email: "email",
 * name: "name",
 * publicKey: "base64 encoded public key"
 * };
 *
 * session(data).then(sessionKey => {
 * console.log(sessionKey);
 * }
 * .catch(err => {
 * console.log(err);
 * }
 * ```
 */

export const session = async (
  data: types.dataSessionKey,
): Promise<openpgp.SessionKey> => {
  const publicKeyBase64 = data.publicKey;
  const publicKeyBuffer = Buffer.from(publicKeyBase64, "base64");
  const publicKey = publicKeyBuffer.toString("utf-8");

  const EncryptSessionKeyOptions = {
    encryptionKeys: await openpgp.readKey({
      armoredKey: publicKey,
    }),
    format: "armored",
    wildcard: true,
    date: new Date(),
    encryptionUserIDs: [{ name: data.name, email: data.email }],
  };

  const sessionKey = await openpgp.generateSessionKey(
    EncryptSessionKeyOptions && {
      encryptionKeys: await openpgp.readKey({
        armoredKey: publicKey,
      }),
      date: new Date(),
      encryptionUserIDs: [{ name: data.name, email: data.email }],
      config: {
        preferredHashAlgorithm: 8, // use SHA-256
        preferredSymmetricAlgorithm: 9, // use AES-256
        preferredCompressionAlgorithm: 1, // use ZIP
        checksumRequired: true, // require integrity checks
        minRSABits: 2048, // require at least 2048 bit RSA keys
        passwordCollisionCheck: true, // check if a password is a collision of a previous password
      },
    },
  );
  console.log(sessionKey);
  return sessionKey;
};

/* Checking if the args variable is empty or not. */
if (args instanceof Array && args.length) {
  const data = {
    email: args[1],
    name: args[3],
    publicKey: args[5],
  };
  session(data);
}

/* Exporting the function `session` so that it can be used in other files. */
export default session;
