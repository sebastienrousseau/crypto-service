/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Hybrid Public Key Encryption (HPKE, RFC 9180).
 *
 * Implements single-shot Base and PSK modes (one message per encapsulation,
 * sequence number 0) for these cipher suites:
 * - DHKEM(X25519, HKDF-SHA256) + HKDF-SHA256 + ChaCha20Poly1305
 * - DHKEM(X25519, HKDF-SHA256) + HKDF-SHA256 + AES-128-GCM
 * - DHKEM(P-256, HKDF-SHA256) + HKDF-SHA256 + AES-128-GCM
 * - DHKEM(P-256, HKDF-SHA256) + HKDF-SHA256 + ChaCha20Poly1305
 *
 * Each combination is checked against the RFC 9180 Appendix A test vectors.
 * Auth and AuthPSK modes, multi-message contexts and the secret export
 * interface are not provided.
 *
 * All inputs and outputs use hex-encoded strings.
 */

import { x25519 } from "@noble/curves/ed25519.js";
import { p256 } from "@noble/curves/nist.js";
import { extract, expand } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { gcm } from "@noble/ciphers/aes.js";

// ---------------------------------------------------------------------------
// Constants (RFC 9180 § 7)
// ---------------------------------------------------------------------------

/** KEM identifier for DHKEM(X25519, HKDF-SHA256). */
const KEM_X25519 = 0x0020;
/** KEM identifier for DHKEM(P-256, HKDF-SHA256). */
const KEM_P256 = 0x0010;
/** KDF identifier for HKDF-SHA256. */
const KDF_HKDF_SHA256 = 0x0001;
/** AEAD identifier for AES-128-GCM. */
const AEAD_AES_128_GCM = 0x0001;
/** AEAD identifier for ChaCha20Poly1305. */
const AEAD_CHACHA20_POLY1305 = 0x0003;
/** mode_base (RFC 9180 § 5). */
const MODE_BASE = 0x00;
/** mode_psk (RFC 9180 § 5). */
const MODE_PSK = 0x01;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * KEM algorithm identifier.
 *
 * @example
 * ```ts
 * const kem: HpkeKem = "x25519";
 * ```
 */
export type HpkeKem = "x25519" | "p256";

/**
 * AEAD algorithm identifier.
 *
 * @example
 * ```ts
 * const aead: HpkeAead = "chacha20-poly1305";
 * ```
 */
export type HpkeAead = "chacha20-poly1305" | "aes-128-gcm";

/**
 * HPKE mode identifier.
 *
 * @example
 * ```ts
 * const mode: HpkeMode = "base";
 * ```
 */
export type HpkeMode = "base" | "psk";

/**
 * HPKE key pair (hex-encoded).
 *
 * @example
 * ```ts
 * const kp: HpkeKeyPair = hpkeGenerateKeyPair("x25519");
 * ```
 */
export interface HpkeKeyPair {
  /** Hex-encoded public key. */
  publicKey: string;
  /** Hex-encoded private key. */
  privateKey: string;
}

/**
 * Result of an HPKE seal (encrypt) operation.
 *
 * @example
 * ```ts
 * const result: HpkeSealResult = hpkeSeal({ recipientPublicKey: kp.publicKey, plaintext: "48656c6c6f" });
 * ```
 */
export interface HpkeSealResult {
  /** Hex-encoded ciphertext (includes AEAD auth tag). */
  ciphertext: string;
  /** Hex-encoded encapsulated key (ephemeral public key). */
  encapsulatedKey: string;
}

/**
 * Result of an HPKE open (decrypt) operation.
 *
 * @example
 * ```ts
 * const result: HpkeOpenResult = hpkeOpen({ recipientPrivateKey: kp.privateKey, encapsulatedKey: sealed.encapsulatedKey, ciphertext: sealed.ciphertext });
 * ```
 */
export interface HpkeOpenResult {
  /** Hex-encoded decrypted plaintext. */
  plaintext: string;
}

/**
 * Cipher suite selection for HPKE.
 *
 * @example
 * ```ts
 * const suite: HpkeSuiteOptions = { kem: "x25519", aead: "aes-128-gcm" };
 * ```
 */
export interface HpkeSuiteOptions {
  /** KEM algorithm (default: "x25519"). */
  kem?: HpkeKem;
  /** AEAD algorithm (default: "chacha20-poly1305"). */
  aead?: HpkeAead;
}

/**
 * Pre-shared key options for HPKE PSK mode.
 *
 * @example
 * ```ts
 * const pskOpts: HpkePskOptions = { psk: "aabbccdd", pskId: "6d794964" };
 * ```
 */
export interface HpkePskOptions {
  /** Hex-encoded pre-shared key. */
  psk: string;
  /** Hex-encoded PSK identifier. */
  pskId: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Regex matching valid hexadecimal strings. */
const HEX_RE = /^[0-9a-fA-F]*$/;

/** Convert a hex string to bytes, throwing on invalid input. */
function hexToBytes(hex: string): Uint8Array {
  if (!HEX_RE.test(hex) || hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }
  return Buffer.from(hex, "hex");
}

/** Convert bytes to a hex string. */
function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/** Encode a number as a big-endian two-byte array (I2OSP(n, 2)). */
function i2osp2(n: number): Uint8Array {
  return new Uint8Array([(n >> 8) & 0xff, n & 0xff]);
}

/** Concatenate multiple byte arrays into a single Uint8Array. */
function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Suite parameters
// ---------------------------------------------------------------------------

/** HPKE cipher suite numeric identifiers and size constants. */
interface SuiteParams {
  kemId: number;
  kdfId: number;
  aeadId: number;
  /** AEAD key length in bytes (Nk). */
  nk: number;
  /** AEAD nonce length in bytes (Nn). */
  nn: number;
  /** KEM shared secret length in bytes (Nsecret). */
  nSecret: number;
  /** KEM enc (serialised public key) length in bytes (Nenc). */
  nEnc: number;
  /** KEM private key length in bytes (Nsk). */
  nSk: number;
}

/** Resolve numeric identifiers and size constants for a KEM+AEAD pair. */
function suiteParams(kem: HpkeKem, aead: HpkeAead): SuiteParams {
  const kemId = kem === "x25519" ? KEM_X25519 : KEM_P256;
  const aeadId =
    aead === "chacha20-poly1305" ? AEAD_CHACHA20_POLY1305 : AEAD_AES_128_GCM;
  const nk = aead === "chacha20-poly1305" ? 32 : 16;
  const nn = 12;
  const nSecret = 32; // both KEMs use SHA-256 → 32-byte shared secret

  let nEnc: number;
  let nSk: number;
  if (kem === "x25519") {
    nEnc = 32; // X25519 public key is 32 bytes
    nSk = 32;
  } else {
    nEnc = 65; // P-256 uncompressed public key is 65 bytes
    nSk = 32;
  }

  return {
    kemId,
    kdfId: KDF_HKDF_SHA256,
    aeadId,
    nk,
    nn,
    nSecret,
    nEnc,
    nSk,
  };
}

/** Build the suite_id for HPKE key schedule: "HPKE" || I2OSP(kem_id,2) || I2OSP(kdf_id,2) || I2OSP(aead_id,2). */
function hpkeSuiteId(params: SuiteParams): Uint8Array {
  return concat(
    Buffer.from("HPKE"),
    i2osp2(params.kemId),
    i2osp2(params.kdfId),
    i2osp2(params.aeadId),
  );
}

/** Build the suite_id for KEM: "KEM" || I2OSP(kem_id, 2). */
function kemSuiteId(kemId: number): Uint8Array {
  return concat(Buffer.from("KEM"), i2osp2(kemId));
}

// ---------------------------------------------------------------------------
// Labeled Extract / Expand (RFC 9180 § 4)
// ---------------------------------------------------------------------------

/**
 * LabeledExtract(salt, label, ikm) = HKDF-Extract(salt, labeled_ikm)
 * where labeled_ikm = concat("HPKE-v1", suite_id, label, ikm)
 */
function labeledExtract(
  suiteId: Uint8Array,
  salt: Uint8Array,
  label: string,
  ikm: Uint8Array,
): Uint8Array {
  const labeledIkm = concat(
    Buffer.from("HPKE-v1"),
    suiteId,
    Buffer.from(label),
    ikm,
  );
  return extract(sha256, labeledIkm, salt.length > 0 ? salt : undefined);
}

/**
 * LabeledExpand(prk, label, info, L) = HKDF-Expand(prk, labeled_info, L)
 * where labeled_info = concat(I2OSP(L, 2), "HPKE-v1", suite_id, label, info)
 */
function labeledExpand(
  suiteId: Uint8Array,
  prk: Uint8Array,
  label: string,
  info: Uint8Array,
  length: number,
): Uint8Array {
  const labeledInfo = concat(
    i2osp2(length),
    Buffer.from("HPKE-v1"),
    suiteId,
    Buffer.from(label),
    info,
  );
  return expand(sha256, prk, labeledInfo, length);
}

// ---------------------------------------------------------------------------
// DHKEM (RFC 9180 § 4.1)
// ---------------------------------------------------------------------------

/** Serialised public key for a private key (P-256 uses the uncompressed form). */
function kemPublicKey(kem: HpkeKem, sk: Uint8Array): Uint8Array {
  return kem === "x25519"
    ? x25519.getPublicKey(sk)
    : p256.getPublicKey(sk, false);
}

/** Generate a random private key valid for the KEM. */
function kemRandomPrivateKey(kem: HpkeKem): Uint8Array {
  return kem === "x25519"
    ? x25519.utils.randomSecretKey()
    : p256.utils.randomSecretKey();
}

/** DH(sk, pk): X25519 output, or the P-256 shared point's x-coordinate. */
function kemDh(kem: HpkeKem, sk: Uint8Array, pk: Uint8Array): Uint8Array {
  if (kem === "x25519") {
    return x25519.getSharedSecret(sk, pk);
  }
  // Extract x-coordinate (bytes 1..33) per RFC 9180 § 7.1.1
  return p256.getSharedSecret(sk, pk, false).subarray(1, 33);
}

/**
 * ExtractAndExpand(dh, kem_context) per RFC 9180 § 4.1:
 *
 *   eae_prk = LabeledExtract("", "eae_prk", dh)
 *   shared_secret = LabeledExpand(eae_prk, "shared_secret", kem_context, Nsecret)
 *
 * Versions before 0.0.7 instead used kem_context as the
 * extract salt and an empty expand info. That schedule was not RFC 9180
 * and did not interoperate with any other implementation; ciphertexts
 * sealed by those releases do not open with this one (and vice versa).
 */
function extractAndExpand(
  params: SuiteParams,
  dh: Uint8Array,
  kemContext: Uint8Array,
): Uint8Array {
  const kemSid = kemSuiteId(params.kemId);
  const eaePrk = labeledExtract(kemSid, new Uint8Array(0), "eae_prk", dh);
  return labeledExpand(
    kemSid,
    eaePrk,
    "shared_secret",
    kemContext,
    params.nSecret,
  );
}

/** Encap(pkR) with an explicit ephemeral private key. */
function dhkemEncap(
  kem: HpkeKem,
  recipientPub: Uint8Array,
  ephPriv: Uint8Array,
  params: SuiteParams,
): { sharedSecret: Uint8Array; enc: Uint8Array } {
  const enc = kemPublicKey(kem, ephPriv);
  const dh = kemDh(kem, ephPriv, recipientPub);
  const sharedSecret = extractAndExpand(params, dh, concat(enc, recipientPub));
  return { sharedSecret, enc };
}

/** Decap(enc, skR): recover the KEM shared secret. */
function dhkemDecap(
  kem: HpkeKem,
  enc: Uint8Array,
  recipientPriv: Uint8Array,
  params: SuiteParams,
): Uint8Array {
  const dh = kemDh(kem, recipientPriv, enc);
  const recipientPub = kemPublicKey(kem, recipientPriv);
  return extractAndExpand(params, dh, concat(enc, recipientPub));
}

// ---------------------------------------------------------------------------
// Key Schedule (RFC 9180 § 5.1)
// ---------------------------------------------------------------------------

/** Output of the HPKE key schedule. */
interface KeyScheduleResult {
  key: Uint8Array;
  baseNonce: Uint8Array;
  exporterSecret: Uint8Array;
}

/** Derive the AEAD key, base nonce and exporter secret via the HPKE key schedule. */
function keySchedule(
  params: SuiteParams,
  sharedSecret: Uint8Array,
  inputs: ScheduleInputs,
): KeyScheduleResult {
  const suiteId = hpkeSuiteId(params);
  const empty = new Uint8Array(0);

  const pskIdHash = labeledExtract(suiteId, empty, "psk_id_hash", inputs.pskId);
  const infoHash = labeledExtract(suiteId, empty, "info_hash", inputs.info);
  const ksContext = concat(new Uint8Array([inputs.mode]), pskIdHash, infoHash);

  const secret = labeledExtract(suiteId, sharedSecret, "secret", inputs.psk);

  return {
    key: labeledExpand(suiteId, secret, "key", ksContext, params.nk),
    baseNonce: labeledExpand(
      suiteId,
      secret,
      "base_nonce",
      ksContext,
      params.nn,
    ),
    exporterSecret: labeledExpand(
      suiteId,
      secret,
      "exp",
      ksContext,
      params.nSecret,
    ),
  };
}

/** Mode, info and PSK inputs to the key schedule, decoded from hex. */
interface ScheduleInputs {
  mode: number;
  info: Uint8Array;
  psk: Uint8Array;
  pskId: Uint8Array;
}

/** Decode the shared seal/open options and check them (RFC 9180 § 5.1 VerifyPSKInputs). */
function scheduleInputs(options: {
  info?: string;
  psk?: HpkePskOptions;
}): ScheduleInputs {
  const info = options.info ? hexToBytes(options.info) : new Uint8Array(0);
  if (!options.psk) {
    return {
      mode: MODE_BASE,
      info,
      psk: new Uint8Array(0),
      pskId: new Uint8Array(0),
    };
  }
  const psk = hexToBytes(options.psk.psk);
  const pskId = hexToBytes(options.psk.pskId);
  if (psk.length === 0 || pskId.length === 0) {
    throw new Error("PSK mode requires a non-empty psk and pskId");
  }
  return { mode: MODE_PSK, info, psk, pskId };
}

// ---------------------------------------------------------------------------
// AEAD helpers
// ---------------------------------------------------------------------------

/** Encrypt plaintext with the specified AEAD algorithm. */
function aeadSeal(
  aead: HpkeAead,
  key: Uint8Array,
  nonce: Uint8Array,
  aad: Uint8Array,
  plaintext: Uint8Array,
): Uint8Array {
  if (aead === "chacha20-poly1305") {
    return chacha20poly1305(key, nonce, aad).encrypt(plaintext);
  }
  return gcm(key, nonce, aad).encrypt(plaintext);
}

/** Decrypt ciphertext with the specified AEAD algorithm. */
function aeadOpen(
  aead: HpkeAead,
  key: Uint8Array,
  nonce: Uint8Array,
  aad: Uint8Array,
  ciphertext: Uint8Array,
): Uint8Array {
  if (aead === "chacha20-poly1305") {
    return chacha20poly1305(key, nonce, aad).decrypt(ciphertext);
  }
  return gcm(key, nonce, aad).decrypt(ciphertext);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an HPKE key pair for the specified KEM.
 *
 * @param kem - KEM algorithm to use (default: `"x25519"`).
 * @returns Hex-encoded key pair.
 *
 * @example
 * ```ts
 * const kp = hpkeGenerateKeyPair("x25519");
 * console.log(kp.publicKey);  // 64-char hex (32 bytes)
 * console.log(kp.privateKey); // 64-char hex (32 bytes)
 * ```
 */
export function hpkeGenerateKeyPair(kem: HpkeKem = "x25519"): HpkeKeyPair {
  const privateKey = kemRandomPrivateKey(kem);
  return {
    publicKey: bytesToHex(kemPublicKey(kem, privateKey)),
    privateKey: bytesToHex(privateKey),
  };
}

/**
 * Encrypt (seal) a plaintext using HPKE.
 *
 * Generates an ephemeral key pair, encapsulates a shared secret against the
 * recipient's public key, derives AEAD key material via the HPKE key schedule,
 * and encrypts the plaintext.
 *
 * @param options - Seal options.
 * @returns Hex-encoded ciphertext and encapsulated key.
 *
 * @example
 * ```ts
 * const kp = hpkeGenerateKeyPair();
 * const sealed = hpkeSeal({
 *   recipientPublicKey: kp.publicKey,
 *   plaintext: "48656c6c6f", // "Hello" in hex
 * });
 * console.log(sealed.ciphertext);      // hex string
 * console.log(sealed.encapsulatedKey); // hex string
 * ```
 */
export function hpkeSeal(options: {
  /** Hex-encoded recipient public key. */
  recipientPublicKey: string;
  /** Hex-encoded plaintext. */
  plaintext: string;
  /** Hex-encoded info string (default: empty). */
  info?: string;
  /** Hex-encoded additional authenticated data (default: empty). */
  aad?: string;
  /** Cipher suite selection. */
  suite?: HpkeSuiteOptions;
  /** Pre-shared key options (enables PSK mode). */
  psk?: HpkePskOptions;
}): HpkeSealResult {
  const kem = options.suite?.kem ?? "x25519";
  const sealed = hpkeSealWithEphemeral(options, kemRandomPrivateKey(kem));
  return {
    ciphertext: sealed.ciphertext,
    encapsulatedKey: sealed.encapsulatedKey,
  };
}

/**
 * HPKE seal with a caller-chosen ephemeral private key, also returning the
 * key-schedule outputs. This exists only so the RFC 9180 Appendix A test
 * vectors (which fix skEm) can be checked; reusing an ephemeral key breaks
 * HPKE's security, so production code must call {@link hpkeSeal}.
 *
 * @internal
 */
export function hpkeSealWithEphemeral(
  options: Parameters<typeof hpkeSeal>[0],
  ephemeralPrivateKey: Uint8Array,
): HpkeSealResult & {
  sharedSecret: string;
  key: string;
  baseNonce: string;
  exporterSecret: string;
} {
  const kem = options.suite?.kem ?? "x25519";
  const aead = options.suite?.aead ?? "chacha20-poly1305";
  const params = suiteParams(kem, aead);

  const recipientPub = hexToBytes(options.recipientPublicKey);
  const plaintext = hexToBytes(options.plaintext);
  const aad = options.aad ? hexToBytes(options.aad) : new Uint8Array(0);
  const inputs = scheduleInputs(options);

  const { sharedSecret, enc } = dhkemEncap(
    kem,
    recipientPub,
    ephemeralPrivateKey,
    params,
  );
  const ks = keySchedule(params, sharedSecret, inputs);
  const ct = aeadSeal(aead, ks.key, ks.baseNonce, aad, plaintext);

  return {
    ciphertext: bytesToHex(ct),
    encapsulatedKey: bytesToHex(enc),
    sharedSecret: bytesToHex(sharedSecret),
    key: bytesToHex(ks.key),
    baseNonce: bytesToHex(ks.baseNonce),
    exporterSecret: bytesToHex(ks.exporterSecret),
  };
}

/**
 * Decrypt (open) an HPKE ciphertext.
 *
 * Decapsulates the shared secret using the recipient's private key, re-derives
 * the AEAD key material, and decrypts the ciphertext.
 *
 * @param options - Open options.
 * @returns Hex-encoded plaintext.
 *
 * @example
 * ```ts
 * const kp = hpkeGenerateKeyPair();
 * const sealed = hpkeSeal({
 *   recipientPublicKey: kp.publicKey,
 *   plaintext: "48656c6c6f",
 * });
 * const opened = hpkeOpen({
 *   recipientPrivateKey: kp.privateKey,
 *   encapsulatedKey: sealed.encapsulatedKey,
 *   ciphertext: sealed.ciphertext,
 * });
 * console.log(opened.plaintext); // "48656c6c6f"
 * ```
 */
export function hpkeOpen(options: {
  /** Hex-encoded recipient private key. */
  recipientPrivateKey: string;
  /** Hex-encoded encapsulated key (from seal). */
  encapsulatedKey: string;
  /** Hex-encoded ciphertext (from seal). */
  ciphertext: string;
  /** Hex-encoded info string (must match seal). */
  info?: string;
  /** Hex-encoded additional authenticated data (must match seal). */
  aad?: string;
  /** Cipher suite selection (must match seal). */
  suite?: HpkeSuiteOptions;
  /** Pre-shared key options (must match seal). */
  psk?: HpkePskOptions;
}): HpkeOpenResult {
  const kem = options.suite?.kem ?? "x25519";
  const aead = options.suite?.aead ?? "chacha20-poly1305";
  const params = suiteParams(kem, aead);

  const recipientPriv = hexToBytes(options.recipientPrivateKey);
  const enc = hexToBytes(options.encapsulatedKey);
  const ciphertext = hexToBytes(options.ciphertext);
  const aad = options.aad ? hexToBytes(options.aad) : new Uint8Array(0);
  const inputs = scheduleInputs(options);

  const sharedSecret = dhkemDecap(kem, enc, recipientPriv, params);
  const { key, baseNonce } = keySchedule(params, sharedSecret, inputs);
  const pt = aeadOpen(aead, key, baseNonce, aad, ciphertext);

  return { plaintext: bytesToHex(pt) };
}
