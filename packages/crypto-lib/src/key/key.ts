import { readFileSync } from "fs";
import * as openpgp from "openpgp";

const privateKeyArmored = readFileSync(__dirname + "/rsa.key");
const publicKeyArmored = readFileSync(__dirname + "/rsa.pub");

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
