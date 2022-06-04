/**
 *
 * Export high level API functions.
 *
 * Usage:
 *
 *  import { generate } from 'cryptolib';
 *  import { revoke } from 'cryptolib';
 *  import { encrypt } from 'cryptolib';
 *  import { decrypt } from 'cryptolib';
 *  import { sign } from 'cryptolib';
 *  import { verify } from 'cryptolib';
 *
 *  generate({ bits, curve, email, expiration, format, name, passphrase, signature, type });
 *  revoke({ passphrase });
 *  encrypt({ message, passphrase });
 *  decrypt({ passphrase, encryptedMessage });
 *  sign({ passphrase, message });
 *  verify({ passphrase, message });
 *
 */
export {
  generate, revoke, encrypt, decrypt, sign, verify
} from './cryptolib';

export {
  PublicKey, PrivateKey
} from './key/key';
