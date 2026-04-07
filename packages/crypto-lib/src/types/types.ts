/**
 * Public input/output types for crypto-lib.
 *
 * Design rules:
 *  - All key material is supplied by the caller as armored ASCII strings.
 *  - The library never reads the filesystem and never holds operator keys.
 *  - Passphrases live as long as the function call and are never logged.
 */

import type { EllipticCurveName } from "openpgp";

/** A passphrase-protected armored OpenPGP private key. */
export type ArmoredPrivateKey = {
  /** ASCII-armored private key block. */
  armored: string;
  /** Passphrase used to decrypt the private key. Omit for unencrypted keys. */
  passphrase?: string;
};

/** Input for {@link generate}. */
export type GenerateInput = {
  name: string;
  email: string;
  /** Passphrase to encrypt the new private key. Empty/omitted = unencrypted. */
  passphrase?: string;
  /** Algorithm family. Defaults to `"ecc"`. */
  type?: "rsa" | "ecc";
  /** RSA modulus size when `type === "rsa"`. Minimum and default: 2048. */
  rsaBits?: number;
  /** Curve name when `type === "ecc"`. Defaults to `"curve25519"`. */
  curve?: EllipticCurveName;
  /** Lifetime in seconds. `0` (default) = never expires. */
  keyExpirationTime?: number;
};

/** Output for {@link generate}. */
export type GenerateOutput = {
  publicKey: string;
  privateKey: string;
  revocationCertificate: string;
};

/** Input for {@link encrypt}. */
export type EncryptInput = {
  message: string;
  /** Armored OpenPGP public key (or concatenated keys) used to encrypt. */
  encryptionKey: string;
  /** Optional armored private key + passphrase used to sign the message. */
  signingKey?: ArmoredPrivateKey;
};

/** Input for {@link decrypt}. */
export type DecryptInput = {
  /** Armored OpenPGP message to decrypt. */
  encryptedMessage: string;
  /** Armored private key + passphrase used to decrypt. */
  decryptionKey: ArmoredPrivateKey;
  /** Optional armored public key used to verify embedded signatures. */
  verificationKey?: string;
};

/** Output for {@link decrypt}. */
export type DecryptOutput = {
  data: string;
  /** Verified signatures, if any. Empty when `verificationKey` is omitted. */
  signatures: { keyID: string; valid: boolean }[];
};

/** Input for {@link sign}. */
export type SignInput = {
  message: string;
  signingKey: ArmoredPrivateKey;
  /** When true, returns a detached signature instead of a cleartext message. */
  detached?: boolean;
};

/** Input for {@link verify}. */
export type VerifyInput = {
  /**
   * If `signature` is omitted, this must be an armored cleartext-signed
   * message. Otherwise it is the plaintext that was detach-signed.
   */
  message: string;
  /** Armored public key (one or more concatenated). */
  verificationKey: string;
  /** Optional armored detached signature. */
  signature?: string;
  /** Override the verification time. Defaults to `new Date()`. */
  date?: Date;
};

/** Output for {@link verify}. */
export type VerifyOutput = {
  /** Always true on success — invalid signatures cause `verify` to throw. */
  valid: true;
  /** Lower-case hex of the first signing key ID. */
  signedBy: string;
};

/** Input for {@link revoke}. */
export type RevokeInput = {
  /** Armored private key (with passphrase) of the key to revoke. */
  privateKey: ArmoredPrivateKey;
  /**
   * Optional revocation reason.
   * Flag values follow RFC 4880 §5.2.3.23:
   *   0 = no reason, 1 = superseded, 2 = compromised,
   *   3 = retired, 32 = user ID no longer valid.
   */
  reason?: { flag?: number; string?: string };
};

/** Output for {@link revoke}. */
export type RevokeOutput = {
  publicKey: string;
  privateKey: string;
};

/** Input for {@link reformat}. */
export type ReformatInput = {
  /** Armored private key (with passphrase) of the key to reformat. */
  privateKey: ArmoredPrivateKey;
  name: string;
  email: string;
  /** Lifetime in seconds for the new self-signature. `0` = never expires. */
  keyExpirationTime?: number;
};

/** Output for {@link reformat}. */
export type ReformatOutput = {
  publicKey: string;
  privateKey: string;
};

/** Input for {@link session}. */
export type SessionInput = {
  /** Armored OpenPGP public key. */
  encryptionKey: string;
  name: string;
  email: string;
};
