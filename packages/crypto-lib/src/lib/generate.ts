import * as openpgp from "openpgp";
import * as types from "../types/types";
import { writeFile } from "fs/promises";

const args = process.argv.slice(2);
// console.log(args);

/**
 * ### generate
 *
 * Provides a function for asymmetric key generation.
 *
 * @public
 * @param {Object} data - Data used to generate
 * @param {String} data.name - Name of the user.
 * @param {String} data.email - Email of the user.
 * @param {String} data.passphrase - Passphrase enumeration.
 * @param {String} data.type - Type of key to be generated.
 * @param {String} data.curve - Curve of key to be generated.
 * @param {String} data.bits - Bits of key to be generated.
 * @param {String} data.expiration - Expiration of key to be generated.
 * @param {String} data.format - Format of key to be generated.
 * @returns {Promise<String>} - Generated key.
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
 */
const generate = async (data: types.dataGenerate): Promise<object> => {

  const { privateKey, publicKey, revocationCertificate } =
    await openpgp.generateKey({
      type: data.type,
      rsaBits: Number(data.rsaBits),
      userIDs: [{ name: data.name, email: data.email }],
      passphrase: data.passphrase,
      curve: data.curve,
      keyExpirationTime: Number(data.keyExpirationTime),
      format: data.format,
    });

  console.log(privateKey); // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
  console.log(publicKey); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
  console.log(revocationCertificate); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '

  const pbkey =
    await writeFile(
      "./src/key/" + data.type + ".pub",
      Buffer.from(publicKey).toString('base64'),
    );
  pbkey;
  const prkey = await writeFile(
    "./src/key/" + data.type + ".key",
    Buffer.from(privateKey).toString('base64'),
  );
  prkey;
  const certificate = await writeFile(
    "./src/key/" + data.type + ".cert",
    Buffer.from(revocationCertificate).toString('base64'),
  );
  certificate;

  return { publicKey, privateKey, revocationCertificate };
};
export default generate;

/* Checking if the args variable is empty or not. */
if (args instanceof Array && args.length) {
  const data = {
    curve: args[9],
    date: new Date(),
    email: args[3],
    format: args[15],
    keyExpirationTime: Number(args[13]),
    name: args[1],
    passphrase: args[5],
    rsaBits: Number(args[11]),
    type: args[7],
    userIDs: [{ name: args[1], email: args[3] }],
  };
  generate(data);
}

