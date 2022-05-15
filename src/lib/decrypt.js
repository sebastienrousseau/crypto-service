import * as openpgp from "openpgp";
import { readFile, writeFile } from "fs/promises";

/* Taking the arguments from the command line and logging them to the console. */
const args = process.argv.slice(2);
console.log(args);


/**
 * It reads the public and private keys from the file system, decrypts the private
 * key with the passphrase, and then decrypts the encrypted message with the public
 * and private keys
 * @returns The decrypted message.
 */
const decrypt = async() => {

  /* Reading the files from the file system. */
  let publicKeyArmored = await readFile("./src/key/rsa.pub.pgp", function(e) { if (e) {throw e;} });
  let privateKeyArmored = await readFile("./src/key/rsa.priv.pgp", function(e) { if (e) {throw e;} });
  // let encryptedMessage = await readFile("./src/data/encrypted.txt", function(e) { if (e) {throw e;} });
  let encryptedMessage = "-----BEGIN PGP MESSAGE-----\n\nwcBMA110yr3GkulyAQf+O5MUt4UX6e80g4+wqFdvyscEXEzCNilXj2B0zf5e\nRYF4OR72Lh3fThx+HCGZHfTS6U2zLCknzDlbVh6DZ1KM512KUFXJNh+F0HAk\nfAP1psfqHbBfclbtRoLn/30IFRyllC85LWt9IW/Zpt30D95n8PmFYiKbP3xN\ncZaJn1Xg9DBAWY0dx23Yp4gbvneQJqpgVqqcWle0TQN7PyE7DA6h1KuQCgV4\n0DV6odMa50pw1O/I1rubMt5EBZDX6RD9VgeHAL6LD/nIjNueuP1IUTdapEw/\nidFTfdq9onpceovkuTysZoibLpv5+oxxGD+svBDyTI0LUFSZFFS9nUZ94Hf1\nXdLAwwGame7XhQJV/sD0uhL340ZMPjM6YVqVPt7HDPsoeM6/q60LDcGPVYf1\nNwIjS0OyDYk/vGZbJ2rbhF3a2+vtqdqBTmLd6QZfRLudDrto8R+bY3WKIScx\nNWB4esz35EZlT7IOTgVz2VxbWetpGp2Rlz2WJXiJrd2VfMoNttOlmGp90PBE\nnDurrai25gBh2WWo6jhJ8BqBv7hiG6TMI0M0CMRBRNKRos69oSnaBVT6L44b\n8RlgjHRJrBsHJWjEwqfrzw+F8ALzLqbhafzQWiiL8rwnGfWOIcPuXTqLcBeM\n0PZJjgCR8bKREDEMsOsxEbyKRStTgGCwILL2SuBH483vpayf0N9uhGp1lwSN\nWpLXXClALBnE5eowBUHqQy576QmkUqHKFEJBnh6HJHO4LnDjaA7NWBvchUg1\nGf8jSKZlrrls5ajlVNs6SuAEltFmCsdLZcv12mAGucWBzEVJZxLlqyD5QHYk\nz42QaPgnMgP8oCXbawB4cIL26E/TfyE0M6ErfeQAyQ==\n=hRBl\n-----END PGP MESSAGE-----\n";
  let passphrase = "123456789abcdef";

  /* Reading the public key from the file system and converting it to a string. */
  const publicKey = await openpgp.readKey({ armoredKey: String(publicKeyArmored) });

  /* Decrypting the private key with the passphrase. */
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readKey({ armoredKey: String(privateKeyArmored) }),
    passphrase
  });

  /* Destructuring the data from the decrypted message. */
  const { data: decrypted/*, signatures*/ } = await openpgp.decrypt({
    message: await openpgp.readMessage({ armoredMessage: String(encryptedMessage) }),
    verificationKeys: publicKey, // optional
    decryptionKeys: privateKey
  });

  /* Writing the decrypted message to a file. */
  // const decryptedMessage = await writeFile("./src/data/decrypted.txt", decrypted, function(e) { if (e) {throw e;} }); decryptedMessage;
  // console.log("❯ Decrypted message: \n\n" + decrypted);
  console.log(decrypted);
  return decrypted;
};
export default decrypt;

