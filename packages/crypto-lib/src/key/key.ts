import { readFileSync } from "fs";
import * as openpgp from "openpgp";

const passphrase = "123456789abcdef";
const privateKeyArmored = readFileSync(__dirname + "/rsa.priv.pgp");
const publicKeyArmored = readFileSync(__dirname + "/rsa.pub.pgp");

export const publicKey = async () => {
  await openpgp.readKey({ armoredKey: publicKeyArmored.toString() });
  return publicKeyArmored.toString();
}

export const PublicKey = openpgp.readKey({ armoredKey: publicKeyArmored.toString() });



export const privateKey = async () => {
  await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({
      armoredKey: privateKeyArmored.toString(),
    }),
    passphrase
  });
  return privateKeyArmored.toString();
}

export const PrivateKey = openpgp.readPrivateKey({ armoredKey: privateKeyArmored.toString() });

export default { publicKey, privateKey, PublicKey, PrivateKey };
