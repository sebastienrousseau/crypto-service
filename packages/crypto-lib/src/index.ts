// /**
//  * ### Index
//  *
//  * @description This is the main entry point for the crypto-lib package.
//  * It exports high level API functions:
//  *
//  * @category Component
//  * @module crypto-lib
//  * @public
//  *
//  * @export **generate**
//  *
//  * A function that takes in an options object and generates a new keypair.
//  *
//  * @export **generateSessionKey**
//  *
//  * A function that takes in an options object and generates a new session key.
//  *
//  * @export **revoke**
//  *
//  * A function that takes in an options object and revokes a keypair.
//  *
//  * @export **encrypt**
//  *
//  * A function that takes in an options object and encrypts a message.
//  *
//  * @export **decrypt**
//  *
//  * A function that takes in an options object and decrypts a message.
//  *
//  * @export **sign**
//  *
//  * A function that takes in an options object and signs a message.
//  *
//  * @export **verify**
//  *
//  * A function that takes in an options object and verifies a message.
//  *
//  * @example
//  * ```
//  *  import { generate } from 'cryptolib';
//  *
//  *  generate({
//  *   name: 'Jane Doe',
//  *   email: 'jane@doe.com',
//  *   passphrase: '123456789abcdef',
//  *   type: 'rsa',
//  *   curve: '',
//  *   rsaBits: 2048,
//  *   keyExpirationTime: 0,
//  *   format: 'armored',
//  *  });
//  * ```
//  */

// export {
//   generate, generateSessionKey, revoke, encrypt, decrypt, sign, verify
// } from './bin/cryptolib';

// /**
//  * ### Key
//  *
//  * @description The key that are used in the crypto-lib package.
//  *
//  * @category Component
//  * @module crypto-lib
//  * @public
//  *
//  * @export **PrivateKeyBase64**
//  *
//  * A class that represents a private key in base64 format.
//  *
//  * @export **PublicKeyBase64**
//  *
//  * A class that represents a public key in base64 format.
//  *
//  * @export **RevocationCertificateBase64**
//  *
//  * A class that represents a revocation certificate in base64 format.
//  *
//  * @export **PrivateKey**
//  *
//  * A class that represents a private key in binary format.
//  *
//  * @export **PublicKey**
//  *
//  * A class that represents a public key in binary format.
//  *
//  * @export **RevocationCertificate**
//  *
//  * A class that represents a revocation certificate in binary format.
//  *
//  */

// export {
//   PrivateKeyBase64,
//   PublicKeyBase64,
//   RevocationCertificateBase64,
//   PrivateKey,
//   PublicKey,
//   RevocationCertificate
// } from './key/key';

// /**
//  *
//  * @description The enums that are used in the crypto-lib package.
//  *
//  * @category Component
//  * @module crypto-lib
//  * @public
//  *
//  * @export **default as enums**
//  *
//  * A list of enums that are used in the crypto-lib package.
//  *
//  * @usage
//  *
//  * ```
//  * import { enums } from 'cryptolib';
//  *
//  * console.log(enums);
//  *
//  * ```
//  *
//  */

// export { default as enums } from './enums';

// /**
//  *
//  * The configuration for the crypto-lib package.
//  *
//  * @category Component
//  * @module crypto-lib
//  * @public
//  * @export **default as config**
//  *
//  * @description A configuration object that is used to configure the crypto-lib package.
//  *
//  * @usage
//  *
//  * ```
//  * import { config } from 'cryptolib';
//  *
//  * console.log(config);
//  *
//  * ```
//  */
// /** End file docs */
// export { default as config } from './config/config';

import CryptoLib from "./bin/cryptolib";

export default CryptoLib;

//# sourceMappingURL=index.js.map
// Language: typescript
