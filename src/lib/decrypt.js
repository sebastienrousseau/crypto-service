import * as openpgp from "openpgp";
import { readFile, writeFile } from "fs/promises";

/* Taking the arguments from the command line and logging them to the console. */
const args = process.argv.slice(2);
console.log(args);

(async() => {

  /* Reading the files from the file system. */
  let publicKeyArmored = await readFile("./src/key/" + args[3] + ".pub.pgp", function(e) { if (e) {throw e;} });
  let privateKeyArmored = await readFile("./src/key/" + args[3] + ".priv.pgp", function(e) { if (e) {throw e;} });
  let encryptedMessage = await readFile("./src/data/encrypted.txt", function(e) { if (e) {throw e;} });
  let passphrase = args[1];

  /* Reading the public key from the file system and converting it to a string. */
  const publicKey = await openpgp.readKey({ armoredKey: String(publicKeyArmored) });

  /* Decrypting the private key with the passphrase. */
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readKey({ armoredKey: String(privateKeyArmored) }),
    passphrase
  });

  /* Destructuring the data from the decrypted message. */
  const { data: decrypted/*, signatures*/ } = await openpgp.decrypt({
    message: await openpgp.readMessage({ armoredMessage: String(encryptedMessage) }),
    verificationKeys: publicKey, // optional
    decryptionKeys: privateKey
  });

  /* Writing the decrypted message to a file. */
  const decryptedMessage = await writeFile("./src/data/decrypted.txt", decrypted, function(e) { if (e) {throw e;} }); decryptedMessage;
  console.log("❯ Decrypted message: \n\n" + decrypted);
})();
