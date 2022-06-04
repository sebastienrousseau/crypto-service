import * as openpgp from "openpgp";
import { PublicKey, PrivateKey } from "../key/key";

const args = process.argv.slice(2);

const encrypt = async (data: { passphrase: string; message: string; }) => {
  const message = data.message;
  const passphrase = data.passphrase;

  const privateKeyRead = await openpgp.decryptKey({
    privateKey: await PrivateKey,
    passphrase,
  });

  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: message }),
    encryptionKeys: await PublicKey,
    signingKeys: privateKeyRead,
  });

  console.log(encrypted);
  return encrypted;
};

if (args instanceof Array && args.length) {
  const data = {
    passphrase: args[1],
    message: args[3],
    publicKey: args[5],
    privateKey: args[7],
  };
  encrypt(data);
}

export default encrypt;
