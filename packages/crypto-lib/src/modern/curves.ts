/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Additional elliptic curve operations via @noble/curves.
 *
 * Supports:
 * - P-256 (secp256r1): NIST standard, widely deployed in TLS/WebCrypto
 * - P-384 (secp384r1): NIST standard, higher security level
 * - Ed448: Edwards curve, 224-bit security, larger keys than Ed25519
 * - X448: Diffie-Hellman on Curve448, 224-bit security
 * - ECDH over P-256 and P-384 (Weierstrass curves)
 */

import { p256, p384 } from "@noble/curves/nist.js";
import { ed448, x448 } from "@noble/curves/ed448.js";
import { schnorr } from "@noble/curves/secp256k1.js";
import { randomBytes } from "@noble/ciphers/utils.js";

// --- Types ---

/** ECDSA P-256 key pair. */
export interface P256KeyPair {
  /** Hex-encoded private key. */
  privateKey: string;
  /** Hex-encoded uncompressed public key. */
  publicKey: string;
  /** Algorithm identifier. */
  algorithm: "ecdsa-p256";
}

/** Result of an ECDSA P-256 signing operation. */
export interface P256SignResult {
  /** Hex-encoded ECDSA signature. */
  signature: string;
  /** Algorithm identifier. */
  algorithm: "ecdsa-p256";
}

/** Result of an ECDSA P-256 verification. */
export interface P256VerifyResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Algorithm identifier. */
  algorithm: "ecdsa-p256";
}

/** ECDSA P-384 key pair. */
export interface P384KeyPair {
  /** Hex-encoded private key. */
  privateKey: string;
  /** Hex-encoded uncompressed public key. */
  publicKey: string;
  /** Algorithm identifier. */
  algorithm: "ecdsa-p384";
}

/** Result of an ECDSA P-384 signing operation. */
export interface P384SignResult {
  /** Hex-encoded ECDSA signature. */
  signature: string;
  /** Algorithm identifier. */
  algorithm: "ecdsa-p384";
}

/** Result of an ECDSA P-384 verification. */
export interface P384VerifyResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Algorithm identifier. */
  algorithm: "ecdsa-p384";
}

/** Ed448 key pair (224-bit security). */
export interface Ed448KeyPair {
  /** Hex-encoded 57-byte private key. */
  privateKey: string;
  /** Hex-encoded 57-byte public key. */
  publicKey: string;
  /** Algorithm identifier. */
  algorithm: "ed448";
}

/** Result of an Ed448 signing operation. */
export interface Ed448SignResult {
  /** Hex-encoded Ed448 signature. */
  signature: string;
  /** Algorithm identifier. */
  algorithm: "ed448";
}

/** Result of an Ed448 signature verification. */
export interface Ed448VerifyResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Algorithm identifier. */
  algorithm: "ed448";
}

/** X448 Diffie-Hellman key pair (224-bit security). */
export interface X448KeyPair {
  /** Hex-encoded 56-byte private key. */
  privateKey: string;
  /** Hex-encoded 56-byte public key. */
  publicKey: string;
  /** Algorithm identifier. */
  algorithm: "x448";
}

/** Result of an X448 Diffie-Hellman key exchange. */
export interface X448ExchangeResult {
  /** Hex-encoded 56-byte shared secret. */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: "x448";
}

/** Result of an ECDH P-256 key exchange. */
export interface EcdhP256Result {
  /** Hex-encoded shared secret. */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: "ecdh-p256";
}

/** Result of an ECDH P-384 key exchange. */
export interface EcdhP384Result {
  /** Hex-encoded shared secret. */
  sharedSecret: string;
  /** Algorithm identifier. */
  algorithm: "ecdh-p384";
}

/** Schnorr (BIP-340, secp256k1) key pair. */
export interface SchnorrKeyPair {
  /** Hex-encoded 32-byte private key. */
  privateKey: string;
  /** Hex-encoded 32-byte x-only public key (BIP-340). */
  publicKey: string;
  /** Algorithm identifier. */
  algorithm: "schnorr";
}

/** Result of a Schnorr (BIP-340) signing operation. */
export interface SchnorrSignResult {
  /** Hex-encoded 64-byte Schnorr signature (BIP-340). */
  signature: string;
  /** Algorithm identifier. */
  algorithm: "schnorr";
}

/** Result of a Schnorr (BIP-340) signature verification. */
export interface SchnorrVerifyResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Algorithm identifier. */
  algorithm: "schnorr";
}

// --- Helpers ---

/** Regex matching valid hexadecimal strings. */
const HEX_RE = /^[0-9a-fA-F]*$/;

/** Parse a hex string into bytes, throwing on invalid input. */
function assertHex(input: string, label: string): Uint8Array {
  if (!HEX_RE.test(input)) {
    throw new Error(`Invalid hex string for ${label}`);
  }
  return Buffer.from(input, "hex");
}

/** Convert a string or Uint8Array to UTF-8 bytes. */
function toBytes(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) return input;
  return Buffer.from(input, "utf8");
}

// --- P-256 (secp256r1) ---

/**
 * Generate a new P-256 key pair.
 */
export function generateP256KeyPair(): P256KeyPair {
  const privateKey = p256.utils.randomSecretKey();
  const publicKey = p256.getPublicKey(privateKey, false); // uncompressed

  return {
    privateKey: Buffer.from(privateKey).toString("hex"),
    publicKey: Buffer.from(publicKey).toString("hex"),
    algorithm: "ecdsa-p256",
  };
}

/**
 * Sign a message with ECDSA P-256.
 */
export function p256Sign(
  privateKeyHex: string,
  message: string | Uint8Array,
): P256SignResult {
  const key = assertHex(privateKeyHex, "privateKey");
  const msg = toBytes(message);
  const signature = p256.sign(msg, key);

  return {
    signature: Buffer.from(signature).toString("hex"),
    algorithm: "ecdsa-p256",
  };
}

/**
 * Verify an ECDSA P-256 signature.
 */
export function p256Verify(
  publicKeyHex: string,
  message: string | Uint8Array,
  signatureHex: string,
): P256VerifyResult {
  const key = assertHex(publicKeyHex, "publicKey");
  const msg = toBytes(message);
  const sig = assertHex(signatureHex, "signature");
  const valid = p256.verify(sig, msg, key);

  return { valid, algorithm: "ecdsa-p256" };
}

// --- P-384 (secp384r1) ---

/**
 * Generate a new P-384 key pair.
 */
export function generateP384KeyPair(): P384KeyPair {
  const privateKey = p384.utils.randomSecretKey();
  const publicKey = p384.getPublicKey(privateKey, false); // uncompressed

  return {
    privateKey: Buffer.from(privateKey).toString("hex"),
    publicKey: Buffer.from(publicKey).toString("hex"),
    algorithm: "ecdsa-p384",
  };
}

/**
 * Sign a message with ECDSA P-384.
 */
export function p384Sign(
  privateKeyHex: string,
  message: string | Uint8Array,
): P384SignResult {
  const key = assertHex(privateKeyHex, "privateKey");
  const msg = toBytes(message);
  const signature = p384.sign(msg, key);

  return {
    signature: Buffer.from(signature).toString("hex"),
    algorithm: "ecdsa-p384",
  };
}

/**
 * Verify an ECDSA P-384 signature.
 */
export function p384Verify(
  publicKeyHex: string,
  message: string | Uint8Array,
  signatureHex: string,
): P384VerifyResult {
  const key = assertHex(publicKeyHex, "publicKey");
  const msg = toBytes(message);
  const sig = assertHex(signatureHex, "signature");
  const valid = p384.verify(sig, msg, key);

  return { valid, algorithm: "ecdsa-p384" };
}

// --- Ed448 ---

/**
 * Generate a new Ed448 key pair.
 */
export function generateEd448KeyPair(): Ed448KeyPair {
  const privateKey = randomBytes(57);
  const publicKey = ed448.getPublicKey(privateKey);

  return {
    privateKey: Buffer.from(privateKey).toString("hex"),
    publicKey: Buffer.from(publicKey).toString("hex"),
    algorithm: "ed448",
  };
}

/**
 * Sign a message with Ed448.
 */
export function ed448Sign(
  privateKeyHex: string,
  message: string | Uint8Array,
): Ed448SignResult {
  const key = assertHex(privateKeyHex, "privateKey");
  const msg = toBytes(message);
  const signature = ed448.sign(msg, key);

  return {
    signature: Buffer.from(signature).toString("hex"),
    algorithm: "ed448",
  };
}

/**
 * Verify an Ed448 signature.
 */
export function ed448Verify(
  publicKeyHex: string,
  message: string | Uint8Array,
  signatureHex: string,
): Ed448VerifyResult {
  const key = assertHex(publicKeyHex, "publicKey");
  const msg = toBytes(message);
  const sig = assertHex(signatureHex, "signature");
  const valid = ed448.verify(sig, msg, key);

  return { valid, algorithm: "ed448" };
}

// --- X448 ---

/**
 * Generate a new X448 key pair for Diffie-Hellman.
 */
export function generateX448KeyPair(): X448KeyPair {
  const privateKey = x448.utils.randomSecretKey();
  const publicKey = x448.getPublicKey(privateKey);

  return {
    privateKey: Buffer.from(privateKey).toString("hex"),
    publicKey: Buffer.from(publicKey).toString("hex"),
    algorithm: "x448",
  };
}

/**
 * Perform X448 Diffie-Hellman key exchange.
 *
 * @param privateKeyHex - Our private key (hex).
 * @param theirPublicKeyHex - The other party's public key (hex).
 * @returns Shared secret (should be passed through HKDF before use).
 */
export function x448Exchange(
  privateKeyHex: string,
  theirPublicKeyHex: string,
): X448ExchangeResult {
  const priv = assertHex(privateKeyHex, "privateKey");
  const pub = assertHex(theirPublicKeyHex, "theirPublicKey");
  const shared = x448.getSharedSecret(priv, pub);

  return {
    sharedSecret: Buffer.from(shared).toString("hex"),
    algorithm: "x448",
  };
}

// --- ECDH over Weierstrass curves ---

/**
 * Perform ECDH key exchange over P-256.
 *
 * @param privateKeyHex - Our private key (hex).
 * @param theirPublicKeyHex - The other party's public key (hex, uncompressed or compressed).
 */
export function ecdhP256(
  privateKeyHex: string,
  theirPublicKeyHex: string,
): EcdhP256Result {
  const priv = assertHex(privateKeyHex, "privateKey");
  const pub = assertHex(theirPublicKeyHex, "theirPublicKey");
  const shared = p256.getSharedSecret(priv, pub);

  return {
    sharedSecret: Buffer.from(shared).toString("hex"),
    algorithm: "ecdh-p256",
  };
}

/**
 * Perform ECDH key exchange over P-384.
 *
 * @param privateKeyHex - Our private key (hex).
 * @param theirPublicKeyHex - The other party's public key (hex, uncompressed or compressed).
 */
export function ecdhP384(
  privateKeyHex: string,
  theirPublicKeyHex: string,
): EcdhP384Result {
  const priv = assertHex(privateKeyHex, "privateKey");
  const pub = assertHex(theirPublicKeyHex, "theirPublicKey");
  const shared = p384.getSharedSecret(priv, pub);

  return {
    sharedSecret: Buffer.from(shared).toString("hex"),
    algorithm: "ecdh-p384",
  };
}

// --- Schnorr (BIP-340) ---

/**
 * Generate a new Schnorr key pair (BIP-340, secp256k1).
 */
export function generateSchnorrKeyPair(): SchnorrKeyPair {
  const privateKey = randomBytes(32);
  const publicKey = schnorr.getPublicKey(privateKey);

  return {
    privateKey: Buffer.from(privateKey).toString("hex"),
    publicKey: Buffer.from(publicKey).toString("hex"),
    algorithm: "schnorr",
  };
}

/**
 * Sign a message with Schnorr (BIP-340).
 */
export function schnorrSign(
  privateKeyHex: string,
  message: string | Uint8Array,
): SchnorrSignResult {
  const key = assertHex(privateKeyHex, "privateKey");
  const msg = toBytes(message);
  const signature = schnorr.sign(msg, key);

  return {
    signature: Buffer.from(signature).toString("hex"),
    algorithm: "schnorr",
  };
}

/**
 * Verify a Schnorr (BIP-340) signature.
 */
export function schnorrVerify(
  publicKeyHex: string,
  message: string | Uint8Array,
  signatureHex: string,
): SchnorrVerifyResult {
  const key = assertHex(publicKeyHex, "publicKey");
  const msg = toBytes(message);
  const sig = assertHex(signatureHex, "signature");
  const valid = schnorr.verify(sig, msg, key);

  return { valid, algorithm: "schnorr" };
}
