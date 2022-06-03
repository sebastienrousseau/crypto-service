import * as openpgp from "openpgp";
import { readFileSync } from "fs";

/* Taking the arguments from the command line and storing them in an array. */
const args = process.argv.slice(2);
// console.log(args);

/**
 * It reads the public and private keys from the file system, decrypts the
 * private key with the passphrase, and then decrypts the encrypted message
 * with the public and private keys.
 * @returns The decrypted message.
 */
const decryption = async (data: { passphrase: string; encryptedMessage: string }) => {
  const passphrase = data.passphrase;
  const privateKeyArmored = await readFileSync(__dirname + "/../key/rsa.priv.pgp");
  const publicKeyArmored = await readFileSync(__dirname + "/../key/rsa.pub.pgp");
  let message = data.encryptedMessage;

  /* Converting the message from base64 to utf-8. */
  message = Buffer.from(message, "base64").toString("utf-8");

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

  /* Destructuring the data from the object returned by the `openpgp.decrypt()`
  function. */
  const { data: decrypted /*, signatures*/ } = await openpgp.decrypt({
    message: await openpgp.readMessage({ armoredMessage: message }),
    verificationKeys: publicKeyRead,
    decryptionKeys: privateKeyRead,
  });

  /* Logging the decrypted message to the console. */
  console.log(decrypted);

  return decrypted;
};

/* Checking if the arguments passed to the function are an array and if the
array has a length. If it does, it is taking the arguments from the command line
and storing them in an array. */
if (args instanceof Array && args.length) {
  const data = {
    encryptedMessage: args[3],
    passphrase: args[1],
    privateKey: args[7],
    publicKey: args[5],
  };
  decryption(data);
}

/* Exporting the `decrypt()` function so that it can be imported into other
files. */
export default decryption;
