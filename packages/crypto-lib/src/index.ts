/**
 *
 * Export high level API functions.
 *
 * Usage:
 *
 *  import { generate } from 'cryptolib';
 *  import { generateSessionKey } from 'cryptolib';
 *  import { revoke } from 'cryptolib';
 *  import { encrypt } from 'cryptolib';
 *  import { decrypt } from 'cryptolib';
 *  import { sign } from 'cryptolib';
 *  import { verify } from 'cryptolib';
 *
 *  generate({ bits, curve, email, expiration, format, name, passphrase, signature, type });
 *  revoke({ passphrase });
 *  encrypt({ message, passphrase });
 *  decrypt({ passphrase, encryptedMessage, publicKey});
 *  sign({ passphrase, message });
 *  verify({ passphrase, message, publicKey});
 *
 */
export {
  generate, generateSessionKey, revoke, encrypt, decrypt, sign, verify
} from './bin/cryptolib';

export {
  PrivateKeyBase64,
  PublicKeyBase64,
  RevocationCertificateBase64,
  PrivateKey,
  PublicKey,
  RevocationCertificate
} from './key/key';

export { default as enums } from './enums';

export { default as config } from './config/config';
