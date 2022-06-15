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

/**
 *
 * @description The decrypt function that is used in the crypto-lib package.
 * @param dataDecrypt - This is the data type that is used to decrypt a message.
 * @public
 * @export **decrypt**
 *
 * Decrypts a message for the given data object.
 *
 * @example
 * ```
 * decrypt({
 * passphrase: '123456789abcdef',
 * encryptedMessage: 'base64 encoded encrypted message',
 * publicKey: 'base64 encoded public key',
 * });
 * ```
 */

export async function decrypt(options: dataDecrypt) {
  const decrypt = await key.decrypt.default(options);
  return decrypt;
}

/**
 *
 * @description The encrypt function that is used in the crypto-lib package.
 * @param dataEncrypt - This is the data type that is used to encrypt a message.
 * @public
 * @export **encrypt**
 *
 * Encrypts a message for the given data object.
 *
 * @example
 * ```
 * encrypt({
 * passphrase: '123456789abcdef',
 * message: 'Hello World',
 * publicKey: 'base64 encoded public key',
 * });
 * ```
 */

export async function encrypt(options: dataEncrypt) {
  const encrypt = await key.encrypt.default(options);
  return encrypt;
}

/**
 *
 * @description The generate function that is used in the crypto-lib package.
 * @param dataGenerate - This is the data type that is used to generate a key pair.
 * @public
 * @export **generate**
 *
 * Generates a key pair for the given data object.
 *
 * @example
 * ```
 *  generate({
 *   name: 'Jane Doe',
 *   email: 'jane@doe.com',
 *   passphrase: '123456789abcdef',
 *   type: 'rsa',
 *   curve: '',
 *   rsaBits: 2048,
 *   keyExpirationTime: 0,
 *   format: 'armored',
 *  });
 * ```
 *
 */

export async function generate(options: dataGenerate) {
  const generate = await key.generate.default(options);
  return generate;
}

/**
 *
 * @description The generateSessionKey function that is used in the crypto-lib package.
 * @param dataGenerateSessionKey - This is the data type that is used to generate a session key.
 * @public
 * @export **generateSessionKey**
 *
 * Generates a session key for the given data object.
 *
 * @example
 * ```
 *  generateSessionKey({
 *   date: '2020-01-01',
 *   email: 'jane@doe.com',
 *   name: 'Jane Doe',
 *   publicKey: 'base64 encoded public key',
 *  });
 * ```
 *
 */

export async function generateSessionKey(options: dataSessionKey) {
  const verify = await key.generateSessionKey.default(options);
  return verify;
}

/**
 *
 * @description The revoke function that is used in the crypto-lib package.
 * @param dataRevoke - This is the data type that is used to revoke a key pair.
 * @public
 * @export **revoke**
 *
 * Revokes a key pair for the given data object.
 *
 * @example
 * ```
 * revoke({
 *  passphrase: '123456789abcdef',
 * });
 * ```
 */

export async function revoke(options: dataRevoke) {
  const revoke = await key.revoke.default(options);
  return revoke;
}

/**
 *
 * @description The sign function that is used in the crypto-lib package.
 * @param dataSign - This is the data type that is used to sign a message.
 * @public
 * @export **sign**
 *
 * Signs a message for the given data object.
 *
 * @example
 * ```
 * sign({
 * passphrase: '123456789abcdef',
 * message: 'Hello World',
 * });
 * ```
 */

export async function sign(options: dataSign) {
  const sign = await key.sign.default(options);
  return sign;
}

/**
 *
 * @description The verify function that is used in the crypto-lib package.
 * @param dataVerify - This is the data type that is used to verify a message.
 * @public
 * @export **verify**
 *
 * Verifies a message for the given data object.
 *
 * @example
 * ```
 * verify({
 * passphrase: '123456789abcdef',
 * message: 'Hello World',
 * publicKey: 'base64 encoded public key',
 * });
 * ```
 */
export async function verify(options: dataVerify) {
  const verify = await key.verify.default(options);
  return verify;
}

/**
 * @description The default functions that are used in the crypto-lib package.
 * @public
 * @export **default**
 *
 * Default exported functions.
 *
*/
export default { decrypt, encrypt, generate, generateSessionKey, sign, verify };
