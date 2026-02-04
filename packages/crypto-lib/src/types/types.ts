import enums from '../enums';

/**
 * User ID interface for OpenPGP key generation
 */
export interface UserID {
  name: string;
  email: string;
}

/**
 * ### types/types.dateGenerate
 *
 * Types used in the Generate Keypair function.
 *
 * @module types/types
 * @public
 * @param {string} curve - Curve enumeration.
 * @param {Date} date - Date enumeration.
 * @param {String} email - Email enumeration.
 * @param {string} format - Format enumeration.
 * @param {Number} keyExpirationTime - Key expiration time enumeration.
 * @param {String} name - Name enumeration.
 * @param {String} passphrase - Password enumeration.
 * @param {Number} rsaBits - RSA bits enumeration.
 * @param {string} type - Type enumeration.
 * @param {UserID[]} userIDs - User IDs enumeration.
 *
 */
export type dataGenerate = {
  date: Date;
  name: string;
  email: string;
  userIDs: UserID[];
  type: keyof typeof enums.type;
  passphrase: string;
  rsaBits: number;
  curve: keyof typeof enums.curve;
  keyExpirationTime: number;
  format: keyof typeof enums.format;
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
 * @param {String} privateKey - Private key enumeration (base64 encoded).
 *
 */
export type dataEncrypt = {
  passphrase: string;
  message: string;
  publicKey: string;
  privateKey: string;
};

/**
 * ### types/types.dataDecrypt
 *
 * Types used in the Decrypt function.
 *
 * @module types/types
 * @public
 * @param {String} passphrase - Passphrase enumeration.
 * @param {String} message - Encrypted message enumeration.
 * @param {String} publicKey - Public key enumeration.
 * @param {String} privateKey - Private key enumeration (base64 encoded).
 *
 */
export type dataDecrypt = {
  passphrase: string;
  message: string;
  publicKey: string;
  privateKey: string;
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
 * @param {string | string[]} verificationKeys   - (required) array of publicKeys or single
 *                                    key, to verify signatures.
 * @param {Boolean} expectSigned      - (optional) If true, verification throws
 *                                    if the message is not signed with the
 *                                    provided publicKeys.
 * @param {string} format                - (optional) Whether to return data as a
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
  date: Date;
  message: string;
  verificationKeys: string | string[];
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
