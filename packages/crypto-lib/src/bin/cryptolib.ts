import * as key from "../lib";
import {
  dataDecrypt,
  dataEncrypt,
  dataGenerate,
  dataRevoke,
  dataSessionKey,
  dataSign,
  dataVerify,
} from "../types/types"

export async function generate(dataGenerate: dataGenerate) {
  const generate = await key.generate.default(dataGenerate);
  return generate;
}

export async function revoke(dataRevoke: dataRevoke) {
  const revoke = await key.revoke.default(dataRevoke);
  return revoke;
}

export async function encrypt(dataEncrypt: dataEncrypt) {
  const encrypt = await key.encrypt.default(dataEncrypt);
  return encrypt;
}

export async function decrypt(dataDecrypt: dataDecrypt) {
  const encrypt = await key.decrypt.default(dataDecrypt);
  return encrypt;
}

export async function sign(dataSign: dataSign) {
  const sign = await key.sign.default(dataSign);
  return sign;
}

export async function verify(dataVerify: dataVerify) {
  const verify = await key.verify.default(dataVerify);
  return verify;
}

export async function generateSessionKey(dataSessionKey: dataSessionKey) {
  const verify = await key.generateSessionKey.default(dataSessionKey);
  return verify;
}

export default { generate, generateSessionKey, encrypt, decrypt, sign, verify };
