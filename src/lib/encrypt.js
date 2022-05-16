import * as openpgp from "openpgp";
import { readFile, writeFile } from "fs/promises";

/* Taking the arguments from the command line and storing them in an array. */
let args = process.argv.slice(2);


/* A self-invoking function. */
const encrypt = async(args) => {
  args = JSON.stringify(args);
  const data = JSON.parse(args);
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
  const encryptedMessage = await writeFile("./src/data/encrypted.txt", encrypted, function(e) { if (e) {throw e;} }); encryptedMessage;
  console.log("❯ Encrypted message: \n\n" + encrypted); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'
  return encrypted;
};
/* Checking if the args variable is empty or not. */
if (args instanceof Array && args.length) {
  let data = args;
  console.log(args);
  data.passphrase = data[1];
  data.message = data[3];
  data = ({passphrase: data.passphrase, message: data.message});
  encrypt(data);
}
export default encrypt;
