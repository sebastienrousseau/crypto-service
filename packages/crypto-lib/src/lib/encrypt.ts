import { writeFile } from "fs/promises";
import * as openpgp from "openpgp";
import * as types from "../types/types";
import { readFileSync } from "fs";


// TODO: review this
// const publicKeyBase64 = readFileSync(__dirname + "/../key/rsa.pub").toString("utf-8");
// const revocationCertificateBase64 = readFileSync(__dirname + "/../key/rsa.cert").toString("utf-8");

const args = process.argv.slice(2);

const encrypt = async (data: types.dataEncrypt): Promise<object> => {
  const message = data.message;
  const passphrase = data.passphrase;
  const privateKeyBase64 = readFileSync(__dirname + "/../key/rsa.key").toString("utf-8");
  const publicKeyArmored = Buffer.from(data.publicKey.toString(), "base64").toString("utf-8");
  const privateKeyArmored = Buffer.from(privateKeyBase64.toString(), "base64").toString("utf-8");
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey(
      {
        armoredKey: privateKeyArmored
      }
    ),
    passphrase,
  });
  // console.log(privateKey);

  const encrypted =
    await openpgp.encrypt({
      message: await openpgp.createMessage({ text: message }),
      encryptionKeys: publicKey,
      signingKeys: privateKey,
    });
    console.log(encrypted);

    const encryptedMsg =  await writeFile(
      "./src/data/encrypted.txt",
      Buffer.from(encrypted.toString()).toString('base64'),
    );
    encryptedMsg;
    return encrypted;
  };
  export default encrypt;

if (args instanceof Array && args.length) {
  const data = {
    passphrase: args[1],
    message: args[3],
    publicKey: args[5],
  };
  encrypt(data);
}


