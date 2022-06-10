import { readFile, writeFile } from "fs/promises";
import * as openpgp from "openpgp";
import * as types from "../types/types";

const args = process.argv.slice(2);

const decrypt = async (data: types.dataDecrypt): Promise<object> => {

  const message = Buffer.from(data.encryptedMessage, "base64").toString("utf-8");
  const passphrase = data.passphrase;
  const privateKeyBase64 = readFile("./src/key/rsa.key");
  const publicKeyArmored = Buffer.from(data.publicKey.toString(), "base64").toString("utf-8");
  // console.log(publicKeyArmored);
  const privateKeyArmored = Buffer.from((await privateKeyBase64).toString(), "base64").toString("utf-8");
  // console.log(privateKeyArmored);
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey(
      {
        armoredKey: privateKeyArmored
      }
    ),
    passphrase,
  });

  const { data: decrypted } = await openpgp.decrypt({
    message: await openpgp.readMessage({ armoredMessage: message }),
    verificationKeys: publicKey,
    decryptionKeys: privateKey,
  });
  console.log(decrypted);

  const decryptedMsg = await writeFile(
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
