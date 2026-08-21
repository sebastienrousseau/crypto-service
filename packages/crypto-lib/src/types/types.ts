import enums from "../enums";

/**
 * User ID interface for OpenPGP key generation
 */
export interface UserID {
  /** Display name of the user. */
  name: string;
  /** Email address of the user. */
  email: string;
}

/** Parameters for OpenPGP key pair generation. */
export type dataGenerate = {
  /** Creation date of the key pair. */
  date: Date;
  /** Display name for the primary user ID. */
  name: string;
  /** Email address for the primary user ID. */
  email: string;
  /** Array of user IDs to embed in the key. */
  userIDs: UserID[];
  /** Key type (e.g. 'ecc' or 'rsa'). */
  type: keyof typeof enums.type;
  /** Passphrase used to encrypt the private key. */
  passphrase: string;
  /** RSA key size in bits (only used when type is 'rsa'). */
  rsaBits: number;
  /** Elliptic curve name (only used when type is 'ecc'). */
  curve: keyof typeof enums.curve;
  /** Seconds until the key expires (0 for no expiration). */
  keyExpirationTime: number;
  /** Output format of the generated key (e.g. 'armored'). */
  format: keyof typeof enums.format;
};

/** Parameters for OpenPGP key revocation. */
export type dataRevoke = {
  /** Passphrase to unlock the private key for revocation. */
  passphrase: string;
  /** Revocation reason flag (0=unspecified, 1=superseded, 2=compromised, 3=retired, 32=uid-invalid). */
  flag: number;
  /** Human-readable revocation reason string. */
  reason: string;
};

/** Parameters for OpenPGP message encryption. */
export type dataEncrypt = {
  /** Passphrase to unlock the private key for signing during encryption. */
  passphrase: string;
  /** Plaintext message to encrypt. */
  message: string;
  /** Armored public key of the recipient. */
  publicKey: string;
  /** Optional armored private key used to sign the encrypted message. */
  privateKey?: string;
};

/** Parameters for OpenPGP message decryption. */
export type dataDecrypt = {
  /** Passphrase to unlock the private key for decryption. */
  passphrase: string;
  /** Armored encrypted message to decrypt. */
  message: string;
  /** Armored public key of the sender for signature verification. */
  publicKey: string;
  /** Optional armored private key used for decryption. */
  privateKey?: string;
};

/** Parameters for OpenPGP message signing. */
export type dataSign = {
  /** Plaintext message to sign. */
  message: string;
  /** When true, produce a detached signature instead of a cleartext-signed message. */
  detached: boolean;
  /** Passphrase to unlock the private signing key. */
  passphrase: string;
};

/** Parameters for OpenPGP signature verification. */
export type dataVerify = {
  /** Date to use for signature validity checks instead of the current time. */
  date: Date;
  /** Signed message (or cleartext message when using a detached signature). */
  message: string;
  /** Armored public key(s) to verify the signature against. */
  verificationKeys: string | string[];
};

/** Parameters for OpenPGP session key generation. */
export type dataSessionKey = {
  /** Email address associated with the session key recipient. */
  email: string;
  /** Display name associated with the session key recipient. */
  name: string;
  /** Armored public key of the session key recipient. */
  publicKey: string;
};

/** Parameters for reformatting an existing OpenPGP key. */
export type dataReformat = {
  /** Creation date to set on the reformatted key. */
  date: Date;
  /** New email address for the reformatted key's user ID. */
  email: string;
  /** Seconds until the reformatted key expires (0 for no expiration). */
  expiration: number;
  /** New display name for the reformatted key's user ID. */
  name: string;
  /** Passphrase to unlock (and re-encrypt) the private key. */
  passphrase: string;
  /** Armored public key to reformat. */
  publicKey: string;
};

// # sourceMappingURL=types.js.map
// Language: typescript
