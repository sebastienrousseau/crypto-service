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
/* eslint-disable  @typescript-eslint/no-explicit-any */
export type dataGenerate = {
  date: Date;
  name: string;
  email: string;
  userIDs: any;
  type: any;
  passphrase: string;
  rsaBits: number;
  curve: any;
  keyExpirationTime: number;
  format: any;
};

/**
 * ### types/types.dataRevoke
 *
 * Types used in the Revoke Key function.
 *
 * @module types/types
 * @public
 * @param {String} passphrase - Passphrase enumeration.
 * @param {Number} flag - Flag enumeration. Default value is '0' - No reason specified. (optional)
 *
 * Other possible values are:
 *    '1'  when the Key is superseded,
 *    '2'  when the Key material has been compromised,
 *    '3'  when the Key is retired and no longer used
 *    '32' when the User ID information is no longer valid.
 * @param {string} reason - Reason enumeration. (optional)
 */
export type dataRevoke = {
  passphrase: string;
  flag: number;
  reason: string;
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
 * @param {String} message             - Message enumeration.
 * @param {Boolean} detached           - If true, the return value should
 *                                       contain a detached signature
 * @param {String} passphrase          - Passphrase enumeration.
 */
export type dataSign = {
  message: string;
  detached: boolean;
  passphrase: string;
};

/**
 * ### types/types.dataVerify
 *
 * Types used in the Signature Verification function.
 *
 * @module types/types
 * @public
 * @param {String} message            - (required) message to be verified.
 * @param {String} verificationKeys   - (required) array of publicKeys or single
 *                                    key, to verify signatures.
 * @param {Boolean} expectSigned      - (optional) If true, verification throws
 *                                    if the message is not signed with the
 *                                    provided publicKeys.
 * @param {Any} format                - (optional) Whether to return data as a
 *                                    string(Stream) or Uint8Array(Stream). If
 *                                    'utf8' (the default), also normalize
 *                                    newlines.
 * @param {String} signature          - (optional) Detached signature for
 *                                    verification.
 * @param {Date} date                 - (optional) Use the given date for
 *                                    verification instead of the current time.
 * @param {String} config             - (optional) Custom configuration settings
 *                                    to overwrite those in config.
 *
 */
export type dataVerify = {
  message: string;
  verificationKeys: string;
  expectSigned: boolean;
  format: any;
  signature: any;
  date: Date;
  config: any;
};

/**
 * ### types/types.dataSessionKey
 *
 * Types used in the Session Key function.
 *
 * @module types/types
 * @public
 * @param {String} email - Email enumeration.
 * @param {String} name - Name enumeration.
 * @param {String} publicKey - Public key enumeration.
 *
 */
export type dataSessionKey = {
  email: string;
  name: string;
  publicKey: string;
};

/**
 * ### types/types.dataReformat
 *
 * Types used in the Reformat function.
 *
 * @module types/types
 * @public
 * @param {String} date - Date enumeration.
 * @param {String} email - Email enumeration.
 * @param {String} expiration - Expiration enumeration.
 * @param {String} name - Name enumeration.
 * @param {String} passphrase - Passphrase enumeration.
 * @param {String} publicKey - Public key enumeration.
 *
 */
export type dataReformat = {
  date: Date;
  email: string;
  expiration: number;
  name: string;
  passphrase: string;
  publicKey: string;
};

// # sourceMappingURL=types.js.map
// Language: typescript
