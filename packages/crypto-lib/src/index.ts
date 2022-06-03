/* Importing the cryptoLib class from the crypto-lib file. */
// import cryptoLib from "./bin/crypto-lib";

// export default cryptoLib;

/**
 * Export high level API functions.
 * Usage:
 *
 *   import { encrypt } from 'cryptolib';
 *   encrypt({ message, publicKeys });
 */
export {
  generate, encrypt, decrypt
} from './cryptolib';

export { PublicKey, PrivateKey } from './key';



