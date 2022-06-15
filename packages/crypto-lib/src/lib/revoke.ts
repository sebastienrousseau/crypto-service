import * as openpgp from "openpgp";
import * as key from "../key/key";

const args = process.argv.slice(2);

const revoke = async (data: { passphrase: string }) => {
  const passphrase = data.passphrase;

  const privateKeyRead = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey(
      {
        armoredKey: key.PrivateKey
      }
    ),
    passphrase,
  });

  const { publicKey: revokedKeyArmored } = await openpgp.revokeKey({
    key: privateKeyRead,
    format: "armored",
  });

  console.log({ publicKey: revokedKeyArmored }); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
  return revokedKeyArmored;
};

if (args instanceof Array && args.length) {
  const data = {
    passphrase: args[1],
  };
  revoke(data);
}
export default revoke;
