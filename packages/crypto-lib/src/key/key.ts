import { readFileSync } from "fs";
import * as openpgp from "openpgp";

const privateKeyArmored = readFileSync(__dirname + "/rsa.priv.pgp");
const publicKeyArmored = readFileSync(__dirname + "/rsa.pub.pgp");

export const PublicKey = openpgp.readKey(
  {
    armoredKey: publicKeyArmored.toString()
  }
);

export const PrivateKey = openpgp.readPrivateKey(
  {
    armoredKey: privateKeyArmored.toString()
  }
);

export default { PublicKey, PrivateKey };
