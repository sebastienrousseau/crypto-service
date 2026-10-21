import * as key from "../lib";
import {
  dataDecrypt,
  dataEncrypt,
  dataGenerate,
  dataReformat,
  dataRevoke,
  dataSessionKey,
  dataSign,
  dataVerify,
} from "../types/types";

import type { ArmoredKeyResult } from "../lib/reformat.js";
import type { KeyOutputOptions } from "../lib/key-output.js";

/** Options of generate, reformat and revoke: `persist: false` writes no files. */
export type { KeyOutputOptions };

/**
 * Decrypts a message for the given data object.
 *
 * @param data - Data used to decrypt a message.
 * @public
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

export async function decrypt(data: dataDecrypt) {
  const decrypt = await key.decrypt.default(data);
  return decrypt;
}

/**
 * Encrypts a message for the given data object.
 *
 * @param data - Data used to encrypt a message.
 * @public
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

export async function encrypt(data: dataEncrypt) {
  const encrypt = await key.encrypt.default(data);
  return encrypt;
}

/**
 * Generates a key pair for the given data object.
 *
 * @param data - Data used to generate a key pair.
 * @param output - `{ persist: false }` writes no files to `CRYPTO_KEY_OUT_DIR`.
 * @public
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

export async function generate(
  data: dataGenerate,
  output: KeyOutputOptions = {},
) {
  const generate = await key.generate.default(data, output);
  return generate;
}

/** Reformat an existing OpenPGP key with new parameters. */
export async function reformat(
  data: dataReformat,
  output: KeyOutputOptions = {},
): Promise<ArmoredKeyResult> {
  const reformat = await key.reformat.default(data, output);
  return reformat;
}

/**
 * Generates a session key for the given data object.
 *
 * @param data - Data used to generate a session key.
 * @public
 *
 * @example
 * ```
 *  session({
 *   date: '2020-01-01',
 *   email: 'jane@doe.com',
 *   name: 'Jane Doe',
 *   publicKey: 'base64 encoded public key',
 *  });
 * ```
 *
 */

export async function session(data: dataSessionKey) {
  const verify = await key.session.default(data);
  return verify;
}

/**
 * Revokes a key pair for the given data object.
 *
 * @param data - Data used to revoke a key pair.
 * @param output - `{ persist: false }` writes no files to `CRYPTO_KEY_OUT_DIR`.
 * @public
 *
 * @example
 * ```
 * revoke({
 *  passphrase: '123456789abcdef',
 * });
 * ```
 */

export async function revoke(
  data: dataRevoke,
  output: KeyOutputOptions = {},
): Promise<ArmoredKeyResult> {
  const revoke = await key.revoke.default(data, output);
  return revoke;
}

/**
 * Signs a message for the given data object.
 *
 * @param data - Data used to sign a message.
 * @public
 *
 * @example
 * ```
 * sign({
 * passphrase: '123456789abcdef',
 * message: 'Hello World',
 * });
 * ```
 */

export async function sign(data: dataSign) {
  const sign = await key.sign.default(data);
  return sign;
}

/**
 * Verifies a message for the given data object.
 *
 * @param data - Data used to verify a message.
 * @public
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
export async function verify(data: dataVerify) {
  const verify = await key.verify.default(data);
  return verify;
}

/**
 * The service's own OpenPGP key pair from `CRYPTO_KEY_DIR`, loaded once
 * and shared with `revoke`. crypto-server uses it so its v1 routes never
 * take a private key from a client.
 */
export { loadKeystore } from "../key/keystore";
/** The armored key pair and revocation certificate `loadKeystore` returns. */
export type { Keystore } from "../key/keystore";
