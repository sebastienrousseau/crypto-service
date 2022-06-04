import * as generation from "./lib/generate";
import * as revocation from "./lib/revoke";
import * as encryption from "./lib/encrypt";
import * as decryption from "./lib/decrypt";
import * as signation from "./lib/sign";
import * as verification from "./lib/verify";

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
      signature: boolean;
      type: string;
    }
) {
  const generate = await generation.default(dataGenerate);
  return generate;
}

export async function revoke(dataRevoke: { passphrase: string }) {
  const revoke = await revocation.default(dataRevoke);
  return revoke;
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

export async function sign(
  dataSign:
    {
      passphrase: string;
      message: string;
    }
) {
  const sign = await signation.default(dataSign);
  return sign;
}

export async function verify(
  dataVerify:
    {
      passphrase: string;
      message: string;
    }
) {
  const verify = await verification.default(dataVerify);
  return verify;
}

export default { generate, encrypt, decrypt, sign, verify };
