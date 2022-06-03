import * as generation from "./lib/generate";
import * as encryption from "./lib/encrypt";
import * as decryption from "./lib/decrypt";

export async function generate(
  dataGenerate:
    {
      bits: number;
      curve: string;
      email: string;
      expiration: number;
      format: string;
      name: string;
      passphrase: string;
      sign: boolean;
      type: string;
    }
) {
  const generate = await generation.default(dataGenerate);
  return generate;
}


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
      encryptedMessage: string;
    }
) {
  const encrypt = await decryption.default(dataDecrypt);
  return encrypt;
}

export default { generate, encrypt, decrypt };
