import { writeFile } from "fs/promises";
import * as key from "../key/key";
import * as openpgp from "openpgp";
import * as types from "../types/types";


const args = process.argv.slice(2);

const encrypt = async (data: types.dataEncrypt): Promise<object> => {
  const message = data.message;
  const passphrase = data.passphrase;

  const publicKeyBase64 = data.publicKey;
  const publicKeyBuffer = Buffer.from(publicKeyBase64, "base64");
  const publicKey = publicKeyBuffer.toString('utf-8');

  const privateKeyRead = await openpgp.decryptKey({
    privateKey: await key.PrivateKey,
    passphrase,
  });

  const encrypted =
    await openpgp.encrypt({
      message: await openpgp.createMessage({ text: message }),
      encryptionKeys: await openpgp.readKey(
        {
          armoredKey: publicKey,
        }
      ),
      signingKeys: privateKeyRead,
    });
    console.log(encrypted);

    const encryptedMsg =  await writeFile(
      "./src/data/encrypted.txt",
      encrypted.toString(),
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


