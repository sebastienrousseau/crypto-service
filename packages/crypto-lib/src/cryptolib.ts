import * as key from "./lib/";

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
  const generate = await key.generate.default(dataGenerate);
  return generate;
}

export async function revoke(dataRevoke: { passphrase: string }) {
  const revoke = await key.revoke.default(dataRevoke);
  return revoke;
}

export async function encrypt(
  dataEncrypt:
    {
      passphrase: string;
      message: string;
      publicKey: string;
    }
) {
  const encrypt = await key.encrypt.default(dataEncrypt);
  return encrypt;
}

export async function decrypt(
  dataDecrypt:
    {
      passphrase: string;
      encryptedMessage: string;
      publicKey: string;
    }
) {
  const encrypt = await key.decrypt.default(dataDecrypt);
  return encrypt;
}

export async function sign(
  dataSign:
    {
      passphrase: string;
      message: string;
    }
) {
  const sign = await key.sign.default(dataSign);
  return sign;
}

export async function verify(
  dataVerify:
    {
      passphrase: string;
      message: string;
      publicKey: string;
    }
) {
  const verify = await key.verify.default(dataVerify);
  return verify;
}

export async function generateSessionKey(
  dataSessionKey:
    {
      date: string;
      email: string;
      name: string;
      publicKey: string;
    }
) {
  const verify = await key.generateSessionKey.default(dataSessionKey);
  return verify;
}

export default { generate, generateSessionKey, encrypt, decrypt, sign, verify };
