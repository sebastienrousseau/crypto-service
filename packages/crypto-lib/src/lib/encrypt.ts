import { writeFile } from "fs/promises";
import { readFileSync } from "fs";
import * as openpgp from "openpgp";
import * as types from "../types/types";

const args = process.argv.slice(2);
// console.log(args);

/**
 * ### encrypt
 *
 * Encrypts data using specified algorithm and public key parameters.
 *
 * @public
 * @param {Object} data - Data to be encrypted.
 * @param {String} data.passphrase - Passphrase enumeration.
 * @param {String} data.message - Message enumeration.
 * @param {String} data.publicKey - Public key enumeration base64 encoded.
 * @returns {Promise<String>} - Encrypted message.
 * @async
 * @example
 * ```javascript
 * import { encrypt } from "crypto-lib";
 *
 * const data = {
 *  passphrase: "passphrase",
 *  message: "message",
 *  publicKey: "base64 encoded public key"
 * };
 *
*/

const encrypt = async (data: types.dataEncrypt): Promise<object> => {

  const message = data.message;
  const passphrase = data.passphrase;

  const privateKeyBase64 = readFileSync(__dirname + "/../key/rsa.key");
  const publicKeyArmored = Buffer.from(data.publicKey.toString(), "base64").toString("utf-8");
  const privateKeyArmored = Buffer.from(privateKeyBase64.toString(), "base64").toString("utf-8");
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey(
      {
        armoredKey: privateKeyArmored
      }
    ),
    passphrase,
  });

  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: message }),
    encryptionKeys: publicKey,
    signingKeys: privateKey,
  });
  console.log(encrypted);

  const encryptedMsg = await writeFile(
    "./src/data/encrypted.txt",
    Buffer.from(encrypted.toString()).toString('base64'),
  );
  encryptedMsg;
  return encrypted;
};

if (args instanceof Array && args.length) {
  const data = {
    passphrase: args[1],
    message: args[3],
    publicKey: args[5]
  };
  encrypt(data);
}

export default encrypt;

//# sourceMappingURL=encrypt.js.map
// Language: typescript
