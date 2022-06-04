import * as openpgp from "openpgp";
import { PublicKey, PrivateKey } from "../key/key";

const args = process.argv.slice(2);

const decryption = async (data: { passphrase: string; encryptedMessage: string }) => {

  const message = Buffer.from(data.encryptedMessage, "base64").toString("utf-8");
  const passphrase = data.passphrase;

  const privateKeyRead = await openpgp.decryptKey({
    privateKey: await PrivateKey,
    passphrase,
  });

  const { data: decrypted /*, signatures*/ } = await openpgp.decrypt({
    message: await openpgp.readMessage({ armoredMessage: message }),
    verificationKeys: await PublicKey,
    decryptionKeys: privateKeyRead,
  });
  console.log(decrypted);
  return decrypted;
};

if (args instanceof Array && args.length) {
  const data = {
    encryptedMessage: args[3],
    passphrase: args[1],
    privateKey: args[7],
    publicKey: args[5],
  };
  decryption(data);
}
export default decryption;
