import * as openpgp from "openpgp";
import { readFile, writeFile } from "fs/promises";

// Initializing Variables
const args = process.argv.slice(2);
console.log(args);

(async() => {

  let publicKeyArmored = await readFile("./src/key/rsa.pub.pgp", function(e) { if (e) {throw e;} });
  let privateKeyArmored = await readFile("./src/key/rsa.priv.pgp", function(e) { if (e) {throw e;} });
  let encryptedMessage = await readFile("./src/data/encrypted.txt", function(e) { if (e) {throw e;} });
  let passphrase = args[1];

  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored.toString() });

  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readKey({ armoredKey: privateKeyArmored.toString() }),
    passphrase
  });

  // const encrypted = await openpgp.encrypt({
  //   message: await openpgp.createMessage({ text: messageString }), // input as Message object
  //   encryptionKeys: publicKey,
  //   signingKeys: privateKey
  // });
  // console.log("❯ Encrypted message: \n\n" + encrypted); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

  const message = await openpgp.readMessage({
    armoredMessage: encryptedMessage.toString() // parse armored message
  });
  const { data: decrypted/*, signatures*/ } = await openpgp.decrypt({
    message,
    verificationKeys: publicKey, // optional
    decryptionKeys: privateKey
  });
  const decryptedMessage = await writeFile("./src/data/decrypted.txt", decrypted, function(e) { if (e) {throw e;} }); decryptedMessage;
  console.log("❯ Decrypted message: \n\n" + decrypted); // 'Crypto Service'
  // console.log(signatures[0].valid); // signature validity (signed messages only)

})();
