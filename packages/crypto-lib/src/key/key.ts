import { readFileSync } from "fs";
import * as openpgp from "openpgp";

const privateKeyArmored = readFileSync(__dirname + "/rsa.key");
const publicKeyArmored = readFileSync(__dirname + "/rsa.pub");
const revocationCertificateArmored = readFileSync(__dirname + "/rsa.cert");

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

export const revocationCertificate = openpgp.readPrivateKey(
  {
    armoredKey: revocationCertificateArmored.toString()
  }
);


export default { PublicKey, PrivateKey, revocationCertificate };
