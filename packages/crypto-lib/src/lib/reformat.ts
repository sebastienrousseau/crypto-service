import * as fs from "fs";
import path from "path";
import { readFileSync } from "fs";
import * as openpgp from "openpgp";
import * as types from "../types/types";

const args = process.argv.slice(2);
// console.log(args);
/**
 * ### reformat
 *
 * Reformats signature packets for a key and rewraps key object.
 * @public
 * @param {Object} data              - Data to be reformatted.
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
  const expiration = data.expiration;
  const passphrase = data.passphrase;

  const privateKeyBase64 = readFileSync(__dirname + "/../key/rsa.key");
  const privateKeyArmored = Buffer.from(
    privateKeyBase64.toString(),
    "base64",
  ).toString("utf-8");

  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({
      armoredKey: privateKeyArmored,
    }),
    passphrase,
  });

  const reformatKeys = await openpgp.reformatKey({
    privateKey: privateKey,
    userIDs: [{ name: data.name, email: data.email }],
    passphrase: passphrase,
    keyExpirationTime: expiration,
    date: new Date(),
    format: "armored",
  });
  console.log(reformatKeys);

  const reformatPubKey = await fs.createWriteStream(
    path.resolve(__dirname, "../key/rsa-reformat.pub"),
    { encoding: "utf8" },
  );
  const reformatPubKeyString = reformatPubKey.toString();
  reformatPubKey.write(Buffer.from(reformatPubKeyString).toString("base64"));
  reformatPubKey.on("finish", () => {
    console.log("✅ Wrote reformat public key data to file");
  });
  reformatPubKey.end();

  const reformatPrivKey = await fs.createWriteStream(
    path.resolve(__dirname, "../key/rsa-reformat.key"),
    { encoding: "utf8" },
  );
  const reformatPrivKeyString = reformatPrivKey.toString();
  reformatPrivKey.write(Buffer.from(reformatPrivKeyString).toString("base64"));
  reformatPrivKey.on("finish", () => {
    console.log("✅ Wrote reformat private key data to file");
  });
  reformatPrivKey.end();

  const reformatCert = await fs.createWriteStream(
    path.resolve(__dirname, "../key/rsa-reformat.cert"),
    { encoding: "utf8" },
  );
  const reformatCertString = reformatCert.toString();
  reformatCert.write(Buffer.from(reformatCertString).toString("base64"));
  reformatCert.on("finish", () => {
    console.log("✅ Wrote reformat certificate key data to file");
  });
  reformatCert.end();

  return reformatKeys;
};
if (args instanceof Array && args.length) {
  const data = {
    date: new Date(),
    email: args[1],
    expiration: Number(args[3]),
    name: args[5],
    passphrase: args[7],
    publicKey: args[9],
  };
  reformat(data);
}

export default reformat;

//# sourceMappingURL=reformat.js.map
// Language: typescript
