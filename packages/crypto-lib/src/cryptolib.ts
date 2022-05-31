import * as encryption from "./lib/encrypt";
import * as decryption from "./lib/decrypt";

/* Taking the arguments from the command line and putting them into an array. */
const args = process.argv.slice(2);
console.log(args);

export async function encrypt(
  dataEncrypt:
    {
      passphrase: string;
      message: string;
    }
) {
  const encrypt = await encryption.default(dataEncrypt);
  return encrypt;
}

export async function decrypt(
  dataDecrypt:
    {
      passphrase: string;
      armored: string;
    }
) {
  const encrypt = await decryption.default(dataDecrypt);
  return encrypt;
}

export default { encrypt, decrypt };
