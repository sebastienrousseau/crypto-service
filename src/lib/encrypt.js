import * as openpgp from "openpgp";
import { readFile } from "fs/promises";

(async() => {

  let publicKeyArmored = await readFile("./src/key/rsa_public.pem", function(e) { if (e) {throw e;} });
  let privateKeyArmored = await readFile("./src/key/rsa_private.pem", function(e) { if (e) {throw e;} });
  let passphrase = "1234567890abcdef";
  let messageString = "Crypto Service";

  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored.toString() });

  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readKey({ armoredKey: privateKeyArmored.toString() }),
    passphrase
  });

  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: messageString }), // input as Message object
    encryptionKeys: publicKey,
    signingKeys: privateKey // optional
  });
  console.log(encrypted); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

  const message = await openpgp.readMessage({
    armoredMessage: encrypted // parse armored message
  });
  const { data: decrypted } = await openpgp.decrypt({
    message,
    verificationKeys: publicKey, // optional
    decryptionKeys: privateKey
  });
  console.log(decrypted); // 'Hello, World!'
  // console.log(signatures[0].valid); // signature validity (signed messages only)
})();
