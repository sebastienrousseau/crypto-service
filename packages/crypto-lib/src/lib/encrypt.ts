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
 *                                  Private keys are used for signing.
 * @returns {Promise<String>}     - Encrypted message as armored string.
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
 *  publicKey: "base64 encoded public key",
 *  privateKey: "base64 encoded private key"
 * };
 *
 */

export const encrypt = async (data: types.dataEncrypt): Promise<string> => {
  const { message, passphrase, publicKey: publicKeyBase64, privateKey: privateKeyBase64 } = data;

  const publicKeyArmored = Buffer.from(publicKeyBase64, "base64").toString("utf-8");
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

  // Build encryption options
  const pgpMessage = await openpgp.createMessage({ text: message });
  const encryptOptions = {
    message: pgpMessage,
    encryptionKeys: publicKey,
  } as Parameters<typeof openpgp.encrypt>[0];

  // Add signing if private key is provided
  if (privateKeyBase64) {
    const privateKeyArmored = Buffer.from(privateKeyBase64, "base64").toString("utf-8");
    const privateKey = await openpgp.decryptKey({
      privateKey: await openpgp.readPrivateKey({
        armoredKey: privateKeyArmored,
      }),
      passphrase,
    });
    encryptOptions.signingKeys = privateKey;
  }

  const encrypted = await openpgp.encrypt(encryptOptions);

  return encrypted.toString();
};

if (args instanceof Array && args.length && args[3] && args[5]) {
  const data = {
    passphrase: args[1],
    message: args[3],
    publicKey: args[5],
    privateKey: args[7] || "",
  };
  encrypt(data);
}

export default encrypt;

//# sourceMappingURL=encrypt.js.map
// Language: typescript
