import * as openpgp from "openpgp";
import * as key from "../key/key";

const args = process.argv.slice(2);

const verify = async (data: { passphrase: string; message: string; publicKey: string;}) => {
  const message = data.message;
  const publicKeyBase64 = data.publicKey;
  const publicKeyBuffer = Buffer.from(publicKeyBase64, "base64");
  const publicKey = publicKeyBuffer.toString('utf-8');
  const unsignedMessage = await openpgp.createMessage({ text: message });
  const passphrase = data.passphrase;

  const privateKeyRead = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey(
      {
        armoredKey: key.PrivateKey
      }
    ),
    passphrase,
  });

  const detachedSignature = await openpgp.sign({
    message: unsignedMessage,
    signingKeys: privateKeyRead,
    detached: true
  });

  console.log(detachedSignature);


  const signature = await openpgp.readSignature({
    armoredSignature: String(detachedSignature), // parse detached signature
  });

  const verified = await openpgp.verify({
    message: await openpgp.createMessage({ text: message }),
    signature,
    verificationKeys: await openpgp.readKey(
      {
        armoredKey: publicKey,
      }
    ),
  });

  console.log(verified);
  return verified;
};

if (args instanceof Array && args.length) {
  const data = {
    passphrase: args[1],
    message: args[3],
    publicKey: args[5],
    privateKey: args[7],
  };
  verify(data);
}

export default verify;

