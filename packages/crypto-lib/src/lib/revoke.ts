import * as openpgp from "openpgp";
import { readFile } from "fs/promises";

/* Taking the arguments from the command line and storing them in an array. */
const args = process.argv.slice(2);
// console.log(args);

const revoke = async (data: { passphrase: string }) => {
  const passphrase = data.passphrase;
  const privateKeyArmored = await readFile("./src/key/rsa.priv.pgp");
  const privateKeyRead = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({
      armoredKey: privateKeyArmored.toString(),
    }),
    passphrase,
  });

  const { publicKey: revokedKeyArmored } = await openpgp.revokeKey({
    key: privateKeyRead,
    format: "armored",
  });

  console.log({ publicKey: revokedKeyArmored }); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
  return revokedKeyArmored;
};

/* Checking if the arguments passed to the function are an array and if the array
has a length. If it does, it is taking the arguments from the command line and
storing them in an array. */
if (args instanceof Array && args.length) {
  const data = {
    passphrase: args[1],
  };
  revoke(data);
}
/* Exporting the function `revoke` so that it can be used in other files. */
export default revoke;
