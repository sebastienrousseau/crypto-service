import * as fs from "fs";
import * as openpgp from "openpgp";
import * as types from "../types/types";
import path from "path";

const args = process.argv.slice(2);
// console.log(args);

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

export async function generate(data: types.dataGenerate): Promise<object> {
  const { privateKey, publicKey, revocationCertificate } =
    await openpgp.generateKey({
      date: new Date(),
      userIDs: [{ name: data.name, email: data.email }],
      type: data.type,
      passphrase: data.passphrase,
      rsaBits: Number(data.rsaBits),
      curve: data.curve,
      keyExpirationTime: Number(data.keyExpirationTime),
      format: data.format
    });

  console.log(privateKey);
  console.log(publicKey);
  console.log(revocationCertificate);

  if (data.type) {
    const pbkey = fs.createWriteStream(
      path.resolve(__dirname, "../key/" + data.type + ".pub"));
    pbkey.write(Buffer.from(publicKey).toString("base64"));
    pbkey.on("finish", () => {
      console.log(
        "🔑 The public key data was written to `" + data.type + ".pub`",
      );
    });
    pbkey.end();

    const prkey = fs.createWriteStream(
      path.resolve(__dirname, "../key/" + data.type + ".key"),
      { encoding: "utf8" },
    );
    prkey.write(Buffer.from(privateKey).toString("base64"));
    prkey.on("finish", () => {
      console.log(
        "🔒 The private key data was written to `" + data.type + ".key`",
      );
    });
    prkey.end();

    const certificate = fs.createWriteStream(
      path.resolve(__dirname, "../key/" + data.type + ".cert"),
      { encoding: "utf8" },
    );
    certificate.write(Buffer.from(revocationCertificate).toString("base64"));
    certificate.on("finish", () => {
      console.log(
        "🔏 The revocation certificate data was written to `" +
        data.type +
        ".cert`",
      );
    });
    certificate.end();

    return { publicKey, privateKey, revocationCertificate };
  }
  return Promise.reject(new Error("No key type specified"));
}
export default generate;

/* Checking if the args variable is empty or not. */
if (args instanceof Array && args.length) {
  const data = {
    date: new Date(),
    name: args[1],
    email: args[3],
    userIDs: [{ name: args[1], email: args[3] }],
    type: args[5],
    passphrase: args[7],
    rsaBits: Number(args[9]),
    curve: args[11],
    keyExpirationTime: Number(args[13]),
    format: args[15]
  };
  console.log(data);
  generate(data);
}
