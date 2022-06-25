import * as openpgp from "openpgp";
import * as types from "../types/types";
import * as fs from 'fs';
import path from 'path';


const args = process.argv.slice(2);
console.log(args);

/**
 * ### generate
 *
 * Generates a new OpenPGP public and private key pair. Supports RSA and ECC
 * keys. By default, primary and subkeys will be of same type. The generated
 * primary key will have signing capabilities. By default, one subkey with
 * encryption capabilities is also generated.
 *
 * @public
 * @param {Object} data             - Data used to generate
 * @param {String} data.name        - Name of the user.
 * @param {String} data.email       - Email of the user.
 * @param {String} data.passphrase  - Passphrase enumeration. The passphrase
 *                                    used to encrypt the generated private key.
 *                                    If omitted or empty, the key won't be
 *                                    encrypted.
 * @param {String} data.type        - Type of key to be generated.
 * @param {String} data.curve       - Curve of key to be generated.
 * @param {String} data.bits        - Bits of key to be generated.
 * @param {String} data.expiration  - Expiration of key to be generated. Number
 *                                    of seconds from the key creation time
 *                                    after which the key expires.
 *                                    0 never expires.
 * @param {String} data.format      - Format of key to be generated. The primary
 *                                    key algorithm type: ECC (default) or RSA.
 * @returns {Promise<String>}       - Generated key.
 *
 * @async
 * @static
 *
 * @example
 * ```javascript
 * import { generate } from "crypto-lib";
 *
 * const data = {
 *  name: "name",
 *  email: "email",
 *  passphrase: "passphrase",
 *  type: "type",
 *  curve: "curve",
 *  bits: "bits",
 *  expiration: "expiration",
 *  format: "format"
 * };
 *
 * const result = await generate(data);
 * result.then(function (data) {
 * return data.toString(); // returns the armored key
 * });
 * result.catch(function (err) {
 * throw err;
 * }); // error handling
 *
 */

export const generate = async (data: types.dataGenerate): Promise<object> => {

  const { privateKey, publicKey, revocationCertificate } =
    await openpgp.generateKey({
      userIDs: [{ name: data.name, email: data.email }],
      passphrase: data.passphrase,
      type: data.type,
      curve: data.curve,
      rsaBits: Number(data.rsaBits),
      keyExpirationTime: Number(data.keyExpirationTime),
      date: new Date(),
      format: data.format,
    });

  console.log(privateKey);
  console.log(publicKey);
  console.log(revocationCertificate);

  const pbkey = await fs.createWriteStream(
        path.resolve(__dirname, "../key/" + data.type + ".pub")
    );
        pbkey.write(Buffer.from(publicKey).toString('base64'));
        pbkey.on('finish', () => {console.log('✅ Wrote public key data to file `' + data.type + '.pub`');});
        pbkey.end();
        pbkey;

  const prkey = await fs.createWriteStream(
    path.resolve(__dirname, "../key/" + data.type + ".key")
    );
        prkey.write(Buffer.from(privateKey).toString('base64'));
        prkey.on('finish', () => {console.log('✅ Wrote private key data to file `' + data.type + '.key`');});
        prkey.end();
        prkey;

  const certificate = await fs.createWriteStream(
    path.resolve(__dirname, "../key/" + data.type + ".cert")
    );
        certificate.write(Buffer.from(revocationCertificate).toString('base64'));
        certificate.on('finish', () => {console.log('✅ Wrote revocation certificate data to file `' + data.type + '.cert`');});
        certificate.end();
        certificate;

  return { publicKey, privateKey, revocationCertificate };
};
export default generate;

/* Checking if the args variable is empty or not. */
if (args instanceof Array && args.length) {
  if (args[0] === "generate") {
    const data = {
      date: new Date(),
      type: args[8],
      rsaBits: Number(args[12]),
      userIDs: [{ name: args[2], email: args[4] }],
      name: args[2],
      email: args[4],
      passphrase: args[6],
      curve: args[10],
      keyExpirationTime: Number(args[14]),
      format: args[16],
    };
    generate(data);
  }
    const data = {
      date: new Date(),
      type: args[7],
      rsaBits: Number(args[11]),
      userIDs: [{ name: args[1], email: args[3] }],
      name: args[1],
      email: args[3],
      passphrase: args[5],
      curve: args[9],
      keyExpirationTime: Number(args[13]),
      format: args[15],
    };
    generate(data);
}
