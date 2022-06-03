import * as openpgp from "openpgp";
import { readFileSync } from "fs";

/* Taking the arguments from the command line and storing them in an array. */
const args = process.argv.slice(2);
// console.log(args);

/**
 * Encryption API
 * @function encrypt
 * @description Encrypts message text/data with public keys, passwords or both at once. At least either public keys or passwords must be specified. If private keys are specified, those will be used to sign the message.
 * @author Sebastien Rousseau <hello@crypto-service.co>
 * @param {Message} data.message - (required) message to be encrypted.
 * @param {String} [data.passphrase] (optional) - A passphrase to encrypt the message key.
 * @param {Key|Array<Key>} [publicKeys] - (optional) array of keys or single key, used to encrypt the message
 * @param {Key|Array<Key>} [privateKeys] - (optional) private keys for signing. If omitted message will not be signed.
 *
 *     {
 *       data: String|ReadableStream<String>|NodeStream, (if `armor` was true, the default)
 *       data.message: Message,
 *       data.passphrase: String,
 *       data.publicKey: Key|Array<Key>,
 *       data.privateKey: Key|Array<Key>,
 *     }
 * @async
 * @static
 */
const encrypt = async (data: { passphrase: string; message: string; }) => {
  const message = data.message;
  const passphrase = data.passphrase;
  const privateKeyArmored = await readFileSync(__dirname + "/../key/rsa.priv.pgp");
  const publicKeyArmored = await readFileSync(__dirname + "/../key/rsa.pub.pgp");

  /**
   * Reading the public key from the file.
   */
  const publicKeyRead = await openpgp.readKey({
    armoredKey: publicKeyArmored.toString(),
  });

  /**
   * Unlock a private key with a given passphrase.
   * @param {Object} options
   * @param {PrivateKey} options.privateKey - The private key to decrypt.
   * @param {String|Array<String>} options.passphrase - The user's passphrase.
   */
  const privateKeyRead = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({
      armoredKey: privateKeyArmored.toString(),
    }),
    passphrase,
  });

  /**
   * Encrypts a message using a public key.
   * If signing keys are specified, those will be used to sign the message.
   * @param {message} message to be encrypted as created by createMessage.
   * @param {encryptionKeys} (optional) array of keys or single key, used to encrypt the message.
   * @param {signingKeys} (optional) private keys for signing. If omitted message will not be signed.
   */
  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: message }),
    encryptionKeys: publicKeyRead,
    signingKeys: privateKeyRead,
  });

  /* Logging the encrypted message to the console. */
  console.log(encrypted);
  return encrypted;
};

/* Checking if the arguments passed to the function are an array and if the
array has a length. */
if (args instanceof Array && args.length) {
  const data = {
    passphrase: args[1],
    message: args[3],
    publicKey: args[5],
    privateKey: args[7],
  };
  encrypt(data);
}

/* Exporting the function `encrypt` so that it can be used in other files. */
export default encrypt;
