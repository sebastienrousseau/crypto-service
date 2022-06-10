import { readFileSync } from "fs";
import * as openpgp from "openpgp";

const privateKeyBase64 = readFileSync(__dirname + "/rsa.key");
const privateKeyArmored = Buffer.from(privateKeyBase64.toString(), "base64").toString("utf-8");
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
