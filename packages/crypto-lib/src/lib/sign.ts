import * as openpgp from "openpgp";
import * as key from "../key/key";

const args = process.argv.slice(2);

const sign = async (data: { passphrase: string; message: string; }) => {
  const message = data.message;
  const passphrase = data.passphrase;
  const unsignedMessage = await openpgp.createCleartextMessage({ text: message });

  const privateKeyRead = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey(
      {
        armoredKey: key.PrivateKey
      }
    ),
    passphrase,
  });

  const signed = await openpgp.sign({
    message: unsignedMessage,
    signingKeys: privateKeyRead,
  });

  console.log(signed);
  return signed;
};

if (args instanceof Array && args.length) {
  const data = {
    passphrase: args[1],
    message: args[3],
    publicKey: args[5],
    privateKey: args[7],
  };
  sign(data);
}

export default sign;

