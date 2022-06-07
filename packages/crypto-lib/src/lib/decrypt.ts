import { writeFile } from "fs/promises";
import * as openpgp from "openpgp";
import * as types from "../types/types";
import * as key from "../key/key";

const args = process.argv.slice(2);

const decrypt = async (data: types.dataDecrypt): Promise<object> => {

  const passphrase = data.passphrase;
  const publicKeyBase64 = Buffer.from(data.publicKey, "base64").toString("utf-8");
  const message = Buffer.from(data.encryptedMessage, "base64").toString("utf-8");
  // console.log(message);

  const publicKey= await openpgp.readKey({armoredKey: publicKeyBase64});

  const privateKey= await openpgp.decryptKey({
    privateKey: await key.PrivateKey,
    passphrase,
  });

  const { data: decrypted } = await openpgp.decrypt({
    message: await openpgp.readMessage({ armoredMessage: message }),
    verificationKeys: publicKey,
    decryptionKeys: privateKey,
  });
  console.log(decrypted);

  const decryptedMsg =  await writeFile(
    "./src/data/decrypted.txt",
    decrypted.toString(),
  );
  decryptedMsg;
  return decrypted;
};
export default decrypt;


if (args instanceof Array && args.length) {
  const data = {
    encryptedMessage: args[3],
    passphrase: args[1],
    publicKey: args[5],
  };
  decrypt(data);
}
