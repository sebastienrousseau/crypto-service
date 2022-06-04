/**
 * Export high level API functions.
 * Usage:
 *
 *   import { encrypt } from 'cryptolib';
 *   encrypt({ passphrase, message });
 */
export {
  generate, encrypt, decrypt
} from './cryptolib';

export {
  PublicKey, PrivateKey
} from './key/key';
