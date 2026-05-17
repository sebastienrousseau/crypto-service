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
  type GeneratedKeyPair,
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
  type HashPasswordResult,
  type VerifyPasswordResult,
} from "./modern/password";
import { randomBytes } from "@noble/ciphers/utils.js";
import {
  getAlgorithm,
  isDeprecated,
  recommended,
  listAlgorithms,
} from "./registry";
import { computeHmac, verifyHmac, type HmacAlgorithm } from "./modern/mac";
import { CryptoError, CryptoErrorCode } from "./errors";

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

/** Options for {@link crypto.verifyPassword}. */
export interface VerifyPasswordOptions {
  /** Password to verify (UTF-8 string or raw bytes). */
  password: string | Uint8Array;
  /** Hex-encoded hash to verify against. */
  hash: string;
  /** Hex-encoded salt. */
  salt: string;
  /** Cost parameters used during hashing. */
  params: { t: number; m: number; p: number };
}

/** Options for {@link crypto.hmacVerify}. */
export interface HmacVerifyOptions {
  /** HMAC algorithm to use. */
  algorithm: HmacAlgorithm;
  /** Hex-encoded key or raw bytes. */
  key: string | Uint8Array;
  /** Data that was authenticated. */
  data: string | Uint8Array;
  /** Hex-encoded MAC to verify against. */
  mac: string;
}

/**
 * Unified crypto namespace.
 */
export const crypto = {
  /**
   * Generate a random 256-bit key (hex string).
   *
   * @returns A 64-character hex string representing 32 random bytes.
   *
   * @example
   * ```ts
   * const key = crypto.randomKey(); // "a1b2c3...64 hex chars"
   * ```
   */
  randomKey(): string {
    return Buffer.from(randomBytes(32)).toString("hex");
  },

  /**
   * Encrypt plaintext with a 256-bit key (secretbox: XChaCha20-Poly1305).
   *
   * @param key - 256-bit key as hex string or `Uint8Array`.
   * @param plaintext - Data to encrypt (UTF-8 string or bytes).
   * @returns Base64-encoded ciphertext (nonce prepended).
   *
   * @example
   * ```ts
   * const ct = crypto.encrypt(key, "Hello, world!");
   * ```
   */
  encrypt(key: string | Uint8Array, plaintext: string | Uint8Array): string {
    return secretboxSeal(key, plaintext).sealed;
  },

  /**
   * Decrypt ciphertext with a 256-bit key.
   *
   * @param key - 256-bit key as hex string or `Uint8Array`.
   * @param ciphertext - Base64-encoded ciphertext (as returned by `encrypt`).
   * @returns Decrypted plaintext bytes.
   *
   * @example
   * ```ts
   * const pt = crypto.decrypt(key, ciphertext);
   * const text = Buffer.from(pt).toString("utf8");
   * ```
   */
  decrypt(key: string | Uint8Array, ciphertext: string): Uint8Array {
    return secretboxOpen(key, ciphertext);
  },

  /**
   * Hash data with the specified algorithm.
   *
   * @param algorithm - Hash algorithm (e.g., "sha3-256", "sha256", "blake3").
   * @param data - Data to hash (UTF-8 string or bytes).
   * @returns Hex-encoded hash digest.
   *
   * @example
   * ```ts
   * const h = crypto.hash("sha3-256", "hello");
   * ```
   */
  hash(algorithm: HashAlgorithm, data: string | Uint8Array): string {
    return modernHash({ algorithm, data }).digest;
  },

  /**
   * Generate a key pair for any supported algorithm.
   *
   * @param algorithm - Key algorithm identifier (e.g., "ed25519", "ml-dsa-65").
   * @param metadata - Optional metadata (kid, use, exp) to attach.
   * @returns Generated key pair with public/private keys, algorithm, kid, metadata.
   *
   * @example
   * ```ts
   * const kp = crypto.generateKeyPair("ed25519");
   * console.log(kp.publicKey, kp.privateKey);
   * ```
   */
  generateKeyPair(
    algorithm: KeyAlgorithm,
    metadata?: KeyMetadata,
  ): GeneratedKeyPair {
    return keygenFn(algorithm, metadata);
  },

  /**
   * Sign a message with any supported signing algorithm.
   *
   * @param algorithm - Signing algorithm (e.g., "ed25519", "schnorr", "ml-dsa-65").
   * @param privateKeyHex - Hex-encoded private key.
   * @param message - Message to sign (UTF-8 string or bytes).
   * @returns Hex-encoded signature.
   * @throws {CryptoError} If the algorithm is not supported.
   *
   * @example
   * ```ts
   * const sig = crypto.sign("ed25519", kp.privateKey, "hello");
   * ```
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
        throw new CryptoError(
          `Unsupported signing algorithm: ${algorithm}`,
          CryptoErrorCode.UNSUPPORTED_ALGORITHM,
        );
    }
  },

  /**
   * Verify a signature with any supported signing algorithm.
   *
   * @param algorithm - Signing algorithm (e.g., "ed25519", "schnorr", "ml-dsa-65").
   * @param publicKeyHex - Hex-encoded public key.
   * @param message - Original message that was signed (UTF-8 string or bytes).
   * @param signatureHex - Hex-encoded signature to verify.
   * @returns `true` if the signature is valid, `false` otherwise.
   * @throws {CryptoError} If the algorithm is not supported.
   *
   * @example
   * ```ts
   * const valid = crypto.verify("ed25519", kp.publicKey, "hello", sig);
   * ```
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
        throw new CryptoError(
          `Unsupported verify algorithm: ${algorithm}`,
          CryptoErrorCode.UNSUPPORTED_ALGORITHM,
        );
    }
  },

  /**
   * Hash a password with Argon2id using safe defaults.
   *
   * @param password - Password to hash (UTF-8 string or raw bytes).
   * @returns Hash result with hex-encoded hash, salt, params, and PHC string.
   *
   * @example
   * ```ts
   * const result = crypto.hashPassword("hunter2");
   * console.log(result.phc); // "$argon2id$v=19$m=65536,t=3,p=4$..."
   * ```
   */
  hashPassword(password: string | Uint8Array): HashPasswordResult {
    return argon2Hash({ password });
  },

  /**
   * Verify a password against an Argon2id hash.
   *
   * @param options - Verification options containing password, hash, salt, and params.
   * @returns Object with `valid` boolean indicating whether the password matches.
   *
   * @example
   * ```ts
   * const { valid } = crypto.verifyPassword({
   *   password: "hunter2",
   *   hash: result.hash,
   *   salt: result.salt,
   *   params: result.params,
   * });
   * ```
   */
  verifyPassword(options: VerifyPasswordOptions): VerifyPasswordResult {
    return argon2Verify({
      password: options.password,
      hash: options.hash,
      salt: options.salt,
      params: options.params,
    });
  },

  /**
   * Verify a password against a PHC-format hash string.
   *
   * @param password - Password to verify (UTF-8 string or raw bytes).
   * @param phc - PHC-format hash string (e.g., `$argon2id$v=19$...`).
   * @returns Object with `valid` boolean indicating whether the password matches.
   *
   * @example
   * ```ts
   * const { valid } = crypto.verifyPasswordPhc("hunter2", result.phc);
   * ```
   */
  verifyPasswordPhc(
    password: string | Uint8Array,
    phc: string,
  ): VerifyPasswordResult {
    return argon2VerifyPhc({ password, phc });
  },

  /**
   * Compute an HMAC.
   *
   * @param algorithm - HMAC algorithm (e.g., "sha256", "sha512").
   * @param key - Hex-encoded key or raw bytes.
   * @param data - Data to authenticate (UTF-8 string or bytes).
   * @returns Hex-encoded MAC.
   *
   * @example
   * ```ts
   * const mac = crypto.hmac("sha256", key, "authenticate me");
   * ```
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
   *
   * @param options - Verification options containing algorithm, key, data, and mac.
   * @returns `true` if the MAC is valid, `false` otherwise.
   *
   * @example
   * ```ts
   * const valid = crypto.hmacVerify({
   *   algorithm: "sha256",
   *   key,
   *   data: "authenticate me",
   *   mac,
   * });
   * ```
   */
  hmacVerify(options: HmacVerifyOptions): boolean {
    return verifyHmac({
      algorithm: options.algorithm,
      key: options.key,
      data: options.data,
      mac: options.mac,
    }).valid;
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
