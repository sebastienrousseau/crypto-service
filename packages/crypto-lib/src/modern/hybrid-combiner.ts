/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks The library's hybrid KEM combiner, and the X25519 + ML-KEM-768
 * helpers every construction built on it uses.
 *
 * {@link combineHybrid} is the v2 combiner documented in pq-kem.ts: it binds
 * both shared secrets, both ciphertexts and both recipient public keys.
 * The sealed box, the multi-recipient envelope and the post-quantum
 * streams each take its X25519 + ML-KEM-768 secret and derive their key as
 *
 *   HKDF-SHA256(ikm = secret, salt = none,
 *               info = "crypto-service/<construction>/v2", L = 32)
 *
 * so a key commits to the exchange it came from and to its construction.
 * Decryption also tries each construction's earlier (v1) key, which bound
 * only the ephemeral key, so data written before still opens.
 */

import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { ml_kem768 } from "../accel/pq-backend";
import type { HybridKemAlgorithm } from "./pq-kem";

/** Transcript of one hybrid encapsulation, fed to {@link combineHybrid}. */
export interface HybridTranscript {
  /** Algorithm identifier, used in the domain-separation label. */
  algorithm: HybridKemAlgorithm;
  /** Classical (ECDH) shared secret. */
  ssClassical: Uint8Array;
  /** ML-KEM shared secret. */
  ssMlKem: Uint8Array;
  /** Sender's ephemeral classical public key (the classical "ciphertext"). */
  ctClassical: Uint8Array;
  /** Recipient's classical public key. */
  pkClassical: Uint8Array;
  /** ML-KEM ciphertext. */
  ctMlKem: Uint8Array;
  /** Recipient's ML-KEM public key. */
  pkMlKem: Uint8Array;
}

/** 4-byte big-endian length prefix followed by the bytes. */
function lengthPrefixed(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + bytes.length);
  new DataView(out.buffer).setUint32(0, bytes.length, false);
  out.set(bytes, 4);
  return out;
}

/**
 * v2 combiner: HKDF-SHA256 over both shared secrets, with a domain label,
 * both ciphertexts and both recipient public keys bound in `info`.
 */
export function combineHybrid(t: HybridTranscript): Uint8Array {
  const ikm = Buffer.concat([t.ssClassical, t.ssMlKem]);
  const info = Buffer.concat([
    lengthPrefixed(Buffer.from(`crypto-service/hybrid-kem/v2/${t.algorithm}`)),
    lengthPrefixed(t.ctClassical),
    lengthPrefixed(t.pkClassical),
    lengthPrefixed(t.ctMlKem),
    lengthPrefixed(t.pkMlKem),
  ]);
  return hkdf(sha256, ikm, undefined, info, 32);
}

/** The key `construction` derives from a v2 hybrid secret. */
function constructionKey(secret: Uint8Array, construction: string): Uint8Array {
  const info = new TextEncoder().encode(`crypto-service/${construction}/v2`);
  return hkdf(sha256, secret, undefined, info, 32);
}

/** One X25519 + ML-KEM-768 encapsulation and the key it gives. */
export interface HybridSend {
  /** Sender's ephemeral X25519 public key. */
  ephPub: Uint8Array;
  /** ML-KEM-768 ciphertext. */
  mlKemCt: Uint8Array;
  /** `construction`'s key, from the v2 secret. */
  key: Uint8Array;
}

/**
 * Encapsulates to a recipient's X25519 and ML-KEM-768 public keys and
 * derives `construction`'s key from the v2 hybrid secret.
 */
export function hybridSend(
  recipX25519Pub: Uint8Array,
  recipMlKemPub: Uint8Array,
  construction: string,
): HybridSend {
  const ephPriv = randomBytes(32);
  const ephPub = x25519.getPublicKey(ephPriv);
  const ssClassical = x25519.getSharedSecret(ephPriv, recipX25519Pub);
  const { cipherText: mlKemCt, sharedSecret: ssMlKem } =
    ml_kem768.encapsulate(recipMlKemPub);
  const secret = combineHybrid({
    algorithm: "x25519-ml-kem-768",
    ssClassical,
    ssMlKem,
    ctClassical: ephPub,
    pkClassical: recipX25519Pub,
    ctMlKem: mlKemCt,
    pkMlKem: recipMlKemPub,
  });
  return { ephPub, mlKemCt, key: constructionKey(secret, construction) };
}

/**
 * The keys a recipient tries, newest first: `construction`'s v2 key, then
 * its v1 key, which `legacyKey` derives from the two shared secrets.
 */
export function hybridReceiveKeys(
  recipX25519Sec: Uint8Array,
  recipMlKemSec: Uint8Array,
  ephPub: Uint8Array,
  mlKemCt: Uint8Array,
  construction: string,
  legacyKey: (ssClassical: Uint8Array, ssMlKem: Uint8Array) => Uint8Array,
): Uint8Array[] {
  const ssMlKem = ml_kem768.decapsulate(mlKemCt, recipMlKemSec);
  const ssClassical = x25519.getSharedSecret(recipX25519Sec, ephPub);
  const secret = combineHybrid({
    algorithm: "x25519-ml-kem-768",
    ssClassical,
    ssMlKem,
    ctClassical: ephPub,
    pkClassical: x25519.getPublicKey(recipX25519Sec),
    ctMlKem: mlKemCt,
    pkMlKem: ml_kem768.getPublicKey(recipMlKemSec),
  });
  return [
    constructionKey(secret, construction),
    legacyKey(ssClassical, ssMlKem),
  ];
}

/**
 * Runs `open` with each key in turn and returns the first result; if every
 * key fails, throws the error the first (newest) key gave.
 */
export function openWithFirstKey<T>(
  keys: Uint8Array[],
  open: (key: Uint8Array) => T,
): T {
  let firstError: unknown;
  for (const key of keys) {
    try {
      return open(key);
    } catch (e) {
      firstError ??= e;
    }
  }
  throw firstError;
}
