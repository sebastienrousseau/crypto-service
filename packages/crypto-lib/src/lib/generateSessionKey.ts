import * as openpgp from "openpgp";

const args = process.argv.slice(2);

/**
 * ### generateSessionKey
 *
 * Generate a new session key object, taking the algorithm preferences of the
 * passed public keys into account.
 *
 * @public
 * @param {Object} data           - Data used to generate session key.
 * @param {String} data.date      - Date enumeration.
 * @param {String} data.email     - Email enumeration.
 * @param {String} data.name      - Name enumeration.
 * @param {String} publicKey      - Public key enumeration base64 encoded.
 *                                  key, used to encrypt the message.
 *                                  This can be an array of keys or single
 *
 * @returns {Promise<String>} - Object with session key data and algorithm.
 *
 * @example
 * ```javascript
 * import { generateSessionKey } from "crypto-lib";
 *
 * const data = {
 * date: "date",
 * email: "email",
 * name: "name",
 * publicKey: "base64 encoded public key"
 * };
 *
 * generateSessionKey(data).then(sessionKey => {
 * console.log(sessionKey);
 * }
 * .catch(err => {
 * console.log(err);
 * }
 * ```
*/

export const generateSessionKey = async (data: {
  date: string;
  email: string;
  name: string;
  publicKey: string;
}) => {
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
      date: new Date(),
      encryptionUserIDs: [{ name: data.name, email: data.email }],
      config: { aeadProtect: true },
    });
  console.log(sessionKey);
  return sessionKey;
}

/* Checking if the args variable is empty or not. */
if (args instanceof Array && args.length) {
  const data = {
    date: args[1],
    email: args[3],
    publicKey: args[5],
    name: args[7],
  };
  generateSessionKey(data);
}

/* Exporting the function `generateSessionKey` so that it can be used in other files. */
export default generateSessionKey;
