import * as openpgp from "openpgp";
import * as types from "../types/types";

const args = process.argv.slice(2);
// console.log(args);

/**
 * ### decrypt
 *
 * Decrypts a message with the user's private key, a session key or a password.
 * One of `decryptionKeys`, `sessionkeys` or `passwords` must be specified
 * (passing a combination of these options is not supported).
 *
 * @public
 * @param {Object} data                     - Data to be decrypted.
 * @param {String} data.cmd                 - Command to be executed.
 * @param {String} data.passphrase          - Passwords to decrypt the message.
 * @param {String} data.message             - The message object with the
 *                                            encrypted data.
 * @param {String} data.publicKey           - Public key enumeration base64
 *                                            encoded. This can be an array of
 *                                            keys or single key, used to
 *                                            decrypt the message.
 * @param {String} data.privateKey          - Private key enumeration base64
 *                                            encoded. Used for decryption.
 * @returns {Promise<String>}               - Decrypted message.
 *
 * @example
 * ```javascript
 * import { decrypt } from "crypto-lib";
 *
 * const data = {
 *  passphrase: "passphrase",
 *  message: "base64 encoded encrypted message",
 *  publicKey: "base64 encoded public key",
 *  privateKey: "base64 encoded private key"
 * };
 *
 * decrypt(data).then(message => {
 *  console.log(message);
 * }
 * .catch(err => {
 *  console.log(err);
 * }
 * ```
 *
 */

export const decrypt = async (data: types.dataDecrypt): Promise<{ data: string; signatureValid: boolean }> => {
  const { message: encryptedMessage, passphrase, publicKey: publicKeyBase64, privateKey: privateKeyBase64 } = data;

  const message = await openpgp.readMessage({
    armoredMessage: Buffer.from(encryptedMessage, "base64").toString("utf-8"),
  });

  if (!privateKeyBase64) {
    throw new Error("Private key is required for decryption");
  }

  const publicKeyArmored = Buffer.from(publicKeyBase64, "base64").toString("utf-8");
  const privateKeyArmored = Buffer.from(privateKeyBase64, "base64").toString("utf-8");

  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
    passphrase,
  });

  const { data: decrypted, signatures } = await openpgp.decrypt({
    message,
    verificationKeys: publicKey,
    decryptionKeys: privateKey,
  });

  let signatureValid = false;
  try {
    if (signatures.length > 0) {
      await signatures[0].verified;
      signatureValid = true;
    }
  } catch (error) {
    signatureValid = false;
  }

  return {
    data: decrypted.toString(),
    signatureValid
  };
};

if (args instanceof Array && args.length && args[3] && args[5]) {
  const data = {
    passphrase: args[1],
    message: args[3],
    publicKey: args[5],
    privateKey: args[7] || "",
  };
  decrypt(data);
}

export default decrypt;

//# sourceMappingURL=decrypt.js.map
// Language: typescript
