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
 * @param {String} data.date          - Date enumeration.
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
 * date: "date",
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

export const session = async (data: types.dataSessionKey): Promise<openpgp.SessionKey> => {
  const publicKeyBase64 = data.publicKey;
  const publicKeyBuffer = Buffer.from(publicKeyBase64, "base64");
  const publicKey = publicKeyBuffer.toString('utf-8');


  const sessionKey =
    await openpgp.generateSessionKey({
      encryptionKeys: await openpgp.readKey(
        {
          armoredKey: publicKey,
        }
      ),
      date: data.date,
      encryptionUserIDs: [{ name: data.name, email: data.email }],
      config: { aeadProtect: true },
    });
  console.log(sessionKey);
  return sessionKey;
}

/* Checking if the args variable is empty or not. */
if (args instanceof Array && args.length) {
  const data = {
    date: new Date(args[1]),
    email: args[3],
    name: args[5],
    publicKey: args[7],
  };
  session(data);
}

/* Exporting the function `session` so that it can be used in other files. */
export default session;
