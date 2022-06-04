/**
 *
 * Export high level API functions.
 *
 * Usage:
 *
 *   import { generate } from 'cryptolib';
 *   import { encrypt } from 'cryptolib';
 *   import { decrypt } from 'cryptolib';
 *   import { sign } from 'cryptolib';
 *
 *   generate({ bits, curve, email, expiration, format, name, passphrase, signature, type });
 *   encrypt({ message, passphrase });
 *   decrypt({ passphrase, encryptedMessage });
 *   sign({ passphrase, message });
 *
 */
export {
  generate, encrypt, decrypt
} from './cryptolib';

export {
  PublicKey, PrivateKey
} from './key/key';
