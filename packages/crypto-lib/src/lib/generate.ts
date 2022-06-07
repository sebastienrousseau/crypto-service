import * as openpgp from "openpgp";
import * as types from "../types/types";
import { writeFileSync } from "fs";

const args = process.argv.slice(2);
// console.log(args);

const generate = async (data: types.dataGenerate): Promise<object> => {

  const { privateKey, publicKey, revocationCertificate } =
    await openpgp.generateKey({
      type: data.type,
      rsaBits: Number(data.rsaBits),
      userIDs: [{ name: data.name, email: data.email }],
      passphrase: data.passphrase,
      curve: data.curve,
      keyExpirationTime: Number(data.keyExpirationTime),
      format: data.format,
    });

  console.log(privateKey); // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
  console.log(publicKey); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
  console.log(revocationCertificate); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '

  const pbkey = await writeFileSync(
    __dirname + '/../key/' + data.type + '.pub',
    publicKey
  );
  pbkey;
  const prkey = await writeFileSync(
    __dirname + '/../key/' + data.type + '.key',
    privateKey,
  );
  prkey;
  const certificate = await writeFileSync(
    __dirname + '/../key/' + data.type + '.cert',
    revocationCertificate,
  );
  certificate;

  return { publicKey, privateKey, revocationCertificate };
};
export default generate;

/* Checking if the args variable is empty or not. */
if (args instanceof Array && args.length) {
  const data = {
    curve: args[9],
    date: new Date(),
    email: args[3],
    format: args[15],
    keyExpirationTime: Number(args[13]),
    name: args[1],
    passphrase: args[5],
    rsaBits: Number(args[11]),
    type: args[7],
    userIDs: [{ name: args[1], email: args[3] }],
  };
  generate(data);
}
