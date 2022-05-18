import * as openpgp from "openpgp";
import { readFile } from "fs/promises";

let publicKey = await readFile("./src/key/rsa_public.key", function(e) {
  if (e) {
    throw e;
  }
});
let privateKey = await readFile("./src/key/rsa_private.key", function(e) {
  if (e) {
    throw e;
  }
});

async() => {
  await openpgp.revokeKey({
    key: (await openpgp.key.readArmored(privateKey)).keys[0],
  });
};

console.log(publicKey.toString()); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
console.log(privateKey.toString()); // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
