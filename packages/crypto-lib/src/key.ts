import * as openpgp from "openpgp";
import { readFileSync } from "fs";

const passphrase = "123456789abcdef";
const privateKeyArmored = readFileSync(__dirname + "/key/rsa.priv.pgp");
const publicKeyArmored = readFileSync(__dirname + "/key/rsa.pub.pgp");

async function readPublicKey(): Promise<string> {
  await openpgp.readKey({
    armoredKey: publicKeyArmored.toString(),
  });
  return publicKeyArmored.toString();
}

export async function PublicKey() {
  const PublicKey = await readPublicKey();
  console.log(PublicKey);
  return PublicKey;
}

async function readPrivateKey(): Promise<string> {
  await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({
      armoredKey: privateKeyArmored.toString(),
    }),
    passphrase
  });
  return privateKeyArmored.toString();
}

export async function PrivateKey() {
  const PrivateKey = await readPrivateKey();
  console.log(PrivateKey);
  return PrivateKey;
}
