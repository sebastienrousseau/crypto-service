import * as openpgp from "openpgp";
import { readFile, writeFile } from "fs/promises";

/* Taking the arguments from the command line and storing them in an array. */
let args = process.argv.slice(2);

/**
 * Encryption transforms understandable text (cleartext) into an unintelligible
 * piece of data (ciphertext).
 * It takes a message and a passphrase, encrypts the message with the public key,
 * and returns the encrypted message result.
 * @param {Object} options
 * @param args - The arguments passed to the function.
 * @returns The encrypted message.
 */
const encrypt = async(args) => {
  /* Converting the array into a JSON object. */
  args = JSON.stringify(args);
  const data = JSON.parse(args);
  // console.log(data);

  /* Reading the public and private keys from the file. */
  let publicKeyArmored = await readFile("./src/key/rsa.pub.pgp", function(e) { if (e) {throw e;} });
  let privateKeyArmored = await readFile("./src/key/rsa.priv.pgp", function(e) { if (e) {throw e;} });
  let passphrase = data.passphrase;
  let message = data.message;

  /* Reading the public key from the file. */
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored.toString() });

  /**
   * Unlock a private key with the given passphrase.
   * This method does not change the original key.
   * @param {Object} options
   * @param {PrivateKey} options.privateKey - The private key to decrypt.
   * @param {String|Array<String>} options.passphrase - The user's passphrase(s).
  */
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readKey({ armoredKey: privateKeyArmored.toString() }),
    passphrase
  });

  /**
  * Encrypts a message using a public key.
  * If signing keys are specified, those will be used to sign the message.
  * @param {message} message to be encrypted as created by createMessage.
  * @param {encryptionKeys} (optional) array of keys or single key, used to encrypt the message.
  * @param {signingKeys} (optional) private keys for signing. If omitted message will not be signed.
  */
  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: message }), // input as Message object
    encryptionKeys: publicKey,
    signingKeys: privateKey
  });

  /* Writing the encrypted message to a file. */
  const encryptedMessage = await writeFile("./src/data/encrypted.txt", encrypted, function(e) { if (e) {throw e;} }); encryptedMessage;

  /* Logging the encrypted message to the console. */
  console.log("\n❯ Encrypted message:\n" + Buffer.from(encrypted).toString("base64")); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

  return Buffer.from(encrypted).toString("base64");
};

/* Checking if the arguments passed to the function are an array and if the array
has a length. If it does, it is taking the arguments from the command line and
storing them in an array. */
if (args instanceof Array && args.length) {
  /* Taking the arguments from the command line and storing them in an array. */
  let data = args;
  // console.log(args);
  data.passphrase = data[1];
  data.message = data[3];
  data = ({passphrase: data.passphrase, message: data.message});
  encrypt(data);
}

/* Exporting the function `encrypt` so that it can be used in other files. */
export default encrypt;
