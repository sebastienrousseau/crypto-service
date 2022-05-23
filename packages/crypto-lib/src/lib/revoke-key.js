import * as openpgp from "openpgp";
import { readFile } from "fs/promises";

const revoke = async() => {
  let privateKey = await readFile("./src/key/rsa_private.key", function(e) {
    if (e) {
      throw e;
    }
  });
  await openpgp.revokeKey({
    key: (await openpgp.key.readArmored(privateKey)).keys[0],
  });
  console.log(privateKey.toString()); // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
};
export default revoke;
