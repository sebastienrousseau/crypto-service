import * as openpgp from "openpgp";
import { readFile, writeFile } from "fs/promises";

/* Taking the arguments from the command line and storing them in an array. */
const args = process.argv.slice(2);
console.log(args);

/* A self-invoking function. */
(async() => {

  /* Reading the public and private keys from the file. */
  let publicKeyArmored = await readFile("./src/key/" + args[5] + ".pub.pgp", function(e) { if (e) {throw e;} });
  let privateKeyArmored = await readFile("./src/key/" + args[5] + ".priv.pgp", function(e) { if (e) {throw e;} });
  let passphrase = args[1];
  let messageString = args[3];

  /* Reading the public key from the file. */
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored.toString() });

  /* Decrypting the private key. */
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readKey({ armoredKey: privateKeyArmored.toString() }),
    passphrase
  });

  /* Encrypting the message. */
  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: messageString }), // input as Message object
    encryptionKeys: publicKey,
    signingKeys: privateKey
  });

  /* Writing the encrypted message to a file. */
  const encryptedMessage = await writeFile("./src/data/encrypted.txt", encrypted, function(e) { if (e) {throw e;} }); encryptedMessage;
  console.log("❯ Encrypted message: \n\n" + encrypted); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

})();
