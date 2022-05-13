import * as openpgp from "openpgp";
import { writeFile } from "fs/promises";

(async() => {
  const { privateKey, publicKey } = await openpgp.generateKey({
    type: "rsa", // Type of the key
    rsaBits: 2048, // RSA key size (defaults to 4096 bits)
    userIDs: [{ name: "John Doe", email: "john@doe.com" }], // you can pass multiple user IDs
    passphrase: "1234567890abcdef" // protects the private key
  });
  const pbkey = await writeFile("./src/key/rsa_public.pem", publicKey, function(e) { if (e) {throw e;} }); pbkey;
  const prkey = await writeFile("./src/key/rsa_private.pem", privateKey, function(e) { if (e) {throw e;} }); prkey;
})();
