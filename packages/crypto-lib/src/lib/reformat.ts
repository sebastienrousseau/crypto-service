import { writeFile } from "fs/promises";
import { readFileSync } from "fs";
import * as key from "../key/key";
import * as openpgp from "openpgp";
import * as types from "../types/types";

const args = process.argv.slice(2);
console.log(args);
/**
 * ### reformat
 *
 * Reformats signature packets for a key and rewraps key object.
 * @public
 * @param {Object} data              - Data to be reformatted.
 * @param {String} data.date         - Date enumeration.
 * @param {String} data.email        - Email enumeration.
 * @param {String} data.name         - Name enumeration.
 * @param {String} data.passphrase   - Passphrase enumeration.
 * @param {String} data.publicKey    - Public key enumeration base64 encoded.
 * @returns {Promise<String>}        - Reformatted public key.
 *
 * @async
 * @static
 *
 * @example
 * ```javascript
 * import { reformat } from "crypto-lib";
 *
 * const data = await reformat({
 *    date: "date",
 *    email: "email",
 *    name: "name",
 *    publicKey: "publicKey base64 encoded",
 * });
 * const result = await reformat(data);
 * console.log(result);
 * ```
 *
 */

export const reformat = async (data: types.dataReformat): Promise<object> => {
  const date = data.date;
  const expiration = data.expiration;
  const passphrase = data.passphrase;


  const privateKeyBase64 = readFileSync(__dirname + "/../key/rsa.key");
  const privateKeyArmored = Buffer.from(privateKeyBase64.toString(), "base64").toString("utf-8");

  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey(
      {
        armoredKey: privateKeyArmored
      }
    ),
    passphrase,
  });

  const reformattedPublicKey = await openpgp.reformatKey({
    privateKey: privateKey,
    userIDs: [{ name: data.name, email: data.email }],
    passphrase: passphrase,
    keyExpirationTime: expiration,
    date: new Date(date),
    format: "armored",
  });
  console.log(reformattedPublicKey);
  const reformattedPub = await writeFile(
    "./src/key/reformatted.pub",
    Buffer.from(reformattedPublicKey.toString()).toString('base64'),
  );
  reformattedPub;
  return reformattedPublicKey;
}
if (args instanceof Array && args.length) {
  const data = {
    date: new Date(args[1]),
    email: args[3],
    expiration: Number(args[5]),
    name: args[9],
    passphrase: args[11],
    publicKey: args[13],
  };
  reformat(data);
}

export default reformat;

//# sourceMappingURL=reformat.js.map
// Language: typescript

