import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import * as openpgp from "openpgp";
import * as types from "../types/types";

const args = process.argv.slice(2);
// console.log(args);

/**
 * ### encrypt
 *
 * Encrypts a message using public keys, passwords or both at once.
 * At least one of `encryptionKeys` or `passwords` must be specified.
 * If signing keys are specified, those will be used to sign the message.
 *
 * @public
 * @param {Object} data           - Data to be encrypted.
 * @param {String} passphrase     - Array of passwords or a single password to
 *                                  encrypt the message.
 * @param {String} message        - Message to be encrypted.
 * @param {String} publicKey      - Public key enumeration base64 encoded.
 *                                  This can be an array of keys or single
 *                                  key, used to encrypt the message.
 * @param {String} privateKey     - Private key enumeration base64 encoded.
 *                                  Private keys are used for signing. If
 *                                  omitted message will not be signed.
 * @returns {Promise<String>}     - Encrypted message (string if `armor` was
 *                                  true, the default; Uint8Array if `armor`
 *                                  was false).
 * @async
 * @static
 *
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

export const encrypt = async (data: types.dataEncrypt): Promise<object> => {

  const message = data.message;
  const passphrase = data.passphrase;

  const privateKeyBase64 = readFileSync(process.cwd() + "/src/key/rsa.key");
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
