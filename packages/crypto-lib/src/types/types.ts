/**
 * ### types/types.dateGenerate
 *
 * Types used in the Generate Keypair function.
 *
 * @module types/types
 * @public
 * @param {Any} curve - Curve enumeration.
 * @param {Date} date - Date enumeration.
 * @param {String} email - Email enumeration.
 * @param {Any} format - Format enumeration.
 * @param {Number} keyExpirationTime - Key expiration time enumeration.
 * @param {String} name - Name enumeration.
 * @param {String} passphrase - Password enumeration.
 * @param {Number} rsaBits - RSA bits enumeration.
 * @param {Any} type - Type enumeration.
 * @param {Any} userIDs - User IDs enumeration.
 *
 */
export type dataGenerate = {
  curve: any;
  date: Date;
  email: string;
  format: any;
  keyExpirationTime: number;
  name: string;
  passphrase: string;
  rsaBits: number;
  type: any;
  userIDs: any;
};

/**
 * ### types/types.dataRevoke
 *
 * Types used in the Revoke Key function.
 *
 * @module types/types
 * @public
 * @param {String} passphrase - Passphrase enumeration.
 *
 */
export type dataRevoke = {
  passphrase: string;
};

/**
 * ### types/types.dataEncrypt
 *
 * Types used in the Encrypt function.
 *
 * @module types/types
 * @public
 * @param {String} passphrase - Passphrase enumeration.
 * @param {String} message - Message enumeration.
 * @param {String} publicKey - Public key enumeration.
 *
 */
export type dataEncrypt = {
  passphrase: string;
  message: string;
  publicKey: string;
};

/**
 * ### types/types.dataDecrypt
 *
 * Types used in the Decrypt function.
 *
 * @module types/types
 * @public
 * @param {String} passphrase - Passphrase enumeration.
 * @param {String} encryptedMessage - Encrypted message enumeration.
 * @param {String} publicKey - Public key enumeration.
 *
 */
export type dataDecrypt = {
  passphrase: string;
  encryptedMessage: string;
  publicKey: string;
};

/**
 * ### types/types.dataSign
 *
 * Types used in the Sign function.
 *
 * @module types/types
 * @public
 * @param {String} passphrase - Passphrase enumeration.
 * @param {String} message - Message enumeration.
 *
 */
export type dataSign = {
  passphrase: string;
  message: string;
};

/**
 * ### types/types.dataVerify
 *
 * Types used in the Verify function.
 *
 * @module types/types
 * @public
 * @param {String} passphrase - Passphrase enumeration.
 * @param {String} message - Message enumeration.
 * @param {String} publicKey - Public key enumeration.
 *
 */
export type dataVerify = {
  passphrase: string;
  message: string;
  publicKey: string;
};

/**
 * ### types/types.dataSessionKey
 *
 * Types used in the Session Key function.
 *
 * @module types/types
 * @public
 * @param {String} date - Date enumeration.
 * @param {String} email - Email enumeration.
 * @param {String} name - Name enumeration.
 * @param {String} publicKey - Public key enumeration.
 *
 */
export type dataSessionKey = {
  date: string;
  email: string;
  name: string;
  publicKey: string;
};

// # sourceMappingURL=types.js.map
// Language: typescript
