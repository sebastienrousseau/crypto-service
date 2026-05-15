/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Unified crypto API — single namespace for all operations.
 *
 * ```ts
 * import { crypto } from '@sebastienrousseau/crypto-lib';
 *
 * const key = crypto.randomKey();
 * const ct  = crypto.encrypt(key, plaintext);
 * const pt  = crypto.decrypt(key, ct);
 * const sig = crypto.sign('ed25519', privateKey, message);
 * const ok  = crypto.verify('ed25519', publicKey, message, sig);
 * const h   = crypto.hash('sha3-256', data);
 * const kp  = crypto.generateKeyPair('ml-dsa-65');
 * const pwd = crypto.hashPassword(password);
 * ```
 */

import {
  seal as secretboxSeal,
  open as secretboxOpen,
} from "./high-level/secretbox";
import { hash as modernHash, type HashAlgorithm } from "./modern/hash";
import {
  generateKeyPair as keygenFn,
  type KeyAlgorithm,
  type KeyMetadata,
} from "./keys/keygen";
import { ed25519Sign, ed25519Verify } from "./modern/signing";
import {
  p256Sign,
  p256Verify,
  p384Sign,
  p384Verify,
  ed448Sign,
  ed448Verify,
  schnorrSign,
  schnorrVerify,
} from "./modern/curves";
import { mlDsaSign, mlDsaVerify } from "./modern/pq-sign";
import {
  hashPassword as argon2Hash,
  verifyPassword as argon2Verify,
  verifyPasswordPhc as argon2VerifyPhc,
} from "./modern/password";
import { randomBytes } from "@noble/ciphers/utils.js";
import {
  getAlgorithm,
  isDeprecated,
  recommended,
  listAlgorithms,
} from "./registry";
import { computeHmac, verifyHmac, type HmacAlgorithm } from "./modern/mac";

/** Supported digital signature algorithms. */
export type SignAlgorithm =
  | "ed25519"
  | "ed448"
  | "ecdsa-p256"
  | "ecdsa-p384"
  | "schnorr"
  | "ml-dsa-44"
  | "ml-dsa-65"
  | "ml-dsa-87";

/**
 * Unified crypto namespace.
 */
export const crypto = {
  /**
   * Generate a random 256-bit key (hex string).
   */
  randomKey(): string {
    return Buffer.from(randomBytes(32)).toString("hex");
  },

  /**
   * Encrypt plaintext with a 256-bit key (secretbox: XChaCha20-Poly1305).
   */
  encrypt(key: string | Uint8Array, plaintext: string | Uint8Array): string {
    return secretboxSeal(key, plaintext).sealed;
  },

  /**
   * Decrypt ciphertext with a 256-bit key.
   */
  decrypt(key: string | Uint8Array, ciphertext: string): Uint8Array {
    return secretboxOpen(key, ciphertext);
  },

  /**
   * Hash data with the specified algorithm (default: sha3-256).
   */
  hash(algorithm: HashAlgorithm, data: string | Uint8Array): string {
    return modernHash({ algorithm, data }).digest;
  },

  /**
   * Generate a key pair for any supported algorithm.
   */
  generateKeyPair(algorithm: KeyAlgorithm, metadata?: KeyMetadata) {
    return keygenFn(algorithm, metadata);
  },

  /**
   * Sign a message with any supported signing algorithm.
   */
  sign(
    algorithm: SignAlgorithm,
    privateKeyHex: string,
    message: string | Uint8Array,
  ): string {
    switch (algorithm) {
      case "ed25519":
        return ed25519Sign(privateKeyHex, message).signature;
      case "ed448":
        return ed448Sign(privateKeyHex, message).signature;
      case "ecdsa-p256":
        return p256Sign(privateKeyHex, message).signature;
      case "ecdsa-p384":
        return p384Sign(privateKeyHex, message).signature;
      case "schnorr":
        return schnorrSign(privateKeyHex, message).signature;
      case "ml-dsa-44":
        return mlDsaSign(44, privateKeyHex, message).signature;
      case "ml-dsa-65":
        return mlDsaSign(65, privateKeyHex, message).signature;
      case "ml-dsa-87":
        return mlDsaSign(87, privateKeyHex, message).signature;
      default:
        throw new Error(`Unsupported signing algorithm: ${algorithm}`);
    }
  },

  /**
   * Verify a signature with any supported signing algorithm.
   */
  verify(
    algorithm: SignAlgorithm,
    publicKeyHex: string,
    message: string | Uint8Array,
    signatureHex: string,
  ): boolean {
    switch (algorithm) {
      case "ed25519":
        return ed25519Verify(publicKeyHex, message, signatureHex).valid;
      case "ed448":
        return ed448Verify(publicKeyHex, message, signatureHex).valid;
      case "ecdsa-p256":
        return p256Verify(publicKeyHex, message, signatureHex).valid;
      case "ecdsa-p384":
        return p384Verify(publicKeyHex, message, signatureHex).valid;
      case "schnorr":
        return schnorrVerify(publicKeyHex, message, signatureHex).valid;
      case "ml-dsa-44":
        return mlDsaVerify(44, publicKeyHex, message, signatureHex).valid;
      case "ml-dsa-65":
        return mlDsaVerify(65, publicKeyHex, message, signatureHex).valid;
      case "ml-dsa-87":
        return mlDsaVerify(87, publicKeyHex, message, signatureHex).valid;
      default:
        throw new Error(`Unsupported verify algorithm: ${algorithm}`);
    }
  },

  /**
   * Hash a password with Argon2id using safe defaults.
   */
  hashPassword(password: string | Uint8Array) {
    return argon2Hash({ password });
  },

  /**
   * Verify a password against an Argon2id hash.
   */
  verifyPassword(
    password: string | Uint8Array,
    hash: string,
    salt: string,
    params: { t: number; m: number; p: number },
  ) {
    return argon2Verify({ password, hash, salt, params });
  },

  /**
   * Verify a password against a PHC-format hash string.
   */
  verifyPasswordPhc(password: string | Uint8Array, phc: string) {
    return argon2VerifyPhc({ password, phc });
  },

  /**
   * Compute an HMAC.
   */
  hmac(
    algorithm: HmacAlgorithm,
    key: string | Uint8Array,
    data: string | Uint8Array,
  ): string {
    return computeHmac({ algorithm, key, data }).mac;
  },

  /**
   * Verify an HMAC.
   */
  hmacVerify(
    algorithm: HmacAlgorithm,
    key: string | Uint8Array,
    data: string | Uint8Array,
    mac: string,
  ): boolean {
    return verifyHmac({ algorithm, key, data, mac }).valid;
  },

  /** Algorithm registry helpers. */
  registry: {
    /** Look up an algorithm by name. */
    get: getAlgorithm,
    /** List all registered algorithms, optionally filtered by category. */
    list: listAlgorithms,
    /** Get the recommended algorithm for a category. */
    recommended,
    /** Check whether an algorithm is deprecated. */
    isDeprecated,
  },
} as const;
