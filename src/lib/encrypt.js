import * as openpgp from "openpgp";
import { readFile, writeFile } from "fs/promises";

/* Taking the arguments from the command line and storing them in an array. */
const args = process.argv.slice(2);


/* A self-invoking function. */
const encrypt = async(obj) => {
  obj = JSON.stringify(obj);
  const data = JSON.parse(obj);
  console.log(data.passphrase);
  let publicKeyArmored = await readFile("./src/key/rsa.pub.pgp", function(e) { if (e) {throw e;} });
  let privateKeyArmored = await readFile("./src/key/rsa.priv.pgp", function(e) { if (e) {throw e;} });
  let passphrase = data.passphrase;
  let messageString = data.message;

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
  // const encryptedMessage = await writeFile("./src/data/encrypted.txt", encrypted, function(e) { if (e) {throw e;} }); encryptedMessage;
  // console.log("❯ Encrypted message: \n\n" + encrypted); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'
  // console.log(encrypted);
  return encrypted;
};
/* Checking if the args variable is empty or not. */
if (args >= 2) {
  let data = args;
  // console.log(args);
  // console.log("args:" + args);
  data.passphrase = data[1];
  data.message = data[3];
  encrypt(data);
}
export default encrypt;
