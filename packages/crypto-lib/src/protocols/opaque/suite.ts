/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks OPAQUE-3DH ciphersuites and the primitives RFC 9807 § 2 builds
 * on: the RFC 9497 OPRF (mode 0x00), HKDF Extract/Expand, HMAC, the hash
 * function, and the 3DH group operations of § 6.4.1.
 *
 * Two configurations are supported, each with the KDF, MAC and hash of
 * its OPRF suite and the AKE group equal to the OPRF group (RFC 9807 § 7):
 * - `P256-SHA256`: P-256, HKDF-SHA256, HMAC-SHA256, SHA-256 (the default).
 * - `ristretto255-SHA512`: ristretto255, HKDF-SHA512, HMAC-SHA512, SHA-512.
 */

import { p256, p256_hasher, p256_oprf } from "@noble/curves/nist.js";
import {
  ristretto255,
  ristretto255_hasher,
  ristretto255_oprf,
} from "@noble/curves/ed25519.js";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { expand, extract } from "@noble/hashes/hkdf.js";
import { hmac } from "@noble/hashes/hmac.js";
import { concatBytes } from "@noble/hashes/utils.js";
import type { CHash } from "@noble/hashes/utils.js";
import { CryptoError } from "../../errors";

/** Identifier of a supported OPAQUE-3DH configuration (named after its OPRF suite). */
export type SuiteId = "P256-SHA256" | "ristretto255-SHA512";

/** Error codes thrown by the OPAQUE functions (as `CryptoError.code`). */
export const OpaqueErrorCode = {
  /** RFC 9807 EnvelopeRecoveryError: wrong password or a forged or fake credential response. */
  ENVELOPE_RECOVERY: "OPAQUE_ENVELOPE_RECOVERY",
  /** RFC 9807 ServerAuthenticationError: the server MAC in KE2 does not verify. */
  SERVER_AUTHENTICATION: "OPAQUE_SERVER_AUTHENTICATION",
  /** RFC 9807 ClientAuthenticationError: the client MAC in KE3 does not verify. */
  CLIENT_AUTHENTICATION: "OPAQUE_CLIENT_AUTHENTICATION",
  /** A message, key or element has the wrong length or is not a valid group element. */
  DESERIALIZE: "OPAQUE_DESERIALIZE",
  /** An input outside the RFC's limits (unknown suite, empty or oversized identity). */
  INVALID_INPUT: "OPAQUE_INVALID_INPUT",
} as const;

/** Nonce length Nn in bytes (RFC 9807 § 2). */
export const Nn = 32;
/** Seed length Nseed in bytes (RFC 9807 § 2). */
export const Nseed = 32;

/** Group element operations used here; both noble point classes provide them. */
interface Element {
  multiply(scalar: bigint): Element;
  equals(other: Element): boolean;
  toBytes(): Uint8Array;
}

/** Group operations used here. */
interface Group {
  fromBytes(bytes: Uint8Array): Element;
  readonly ZERO: Element;
  readonly Fn: { fromBytes(bytes: Uint8Array): bigint };
}

/** RFC 9497 OPRF (mode 0x00) operations used here. */
type Oprf = typeof p256_oprf.oprf;

/**
 * Everything a configuration fixes.
 * @internal
 */
export interface Suite {
  readonly id: SuiteId;
  /** Hash output length; also Nm (HMAC) and Nx (HKDF-Extract) here. */
  readonly Nh: number;
  /** Serialized AKE public key length. */
  readonly Npk: number;
  /** Serialized OPRF element length. */
  readonly Noe: number;
  /** OPRF private key length. */
  readonly Nok: number;
  readonly hash: CHash;
  readonly oprf: Oprf;
  readonly group: Group;
  readonly hashToGroup: (msg: Uint8Array, opts: { DST: Uint8Array }) => Element;
  /** RFC 9497 HashToGroup DST for this suite in mode 0x00. */
  readonly blindDst: Uint8Array;
}

/** UTF-8 encode a string. @internal */
export function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** Bytes as given, or a string as UTF-8. @internal */
export function toBytes(value: Uint8Array | string): Uint8Array {
  return typeof value === "string" ? utf8(value) : value;
}

/** I2OSP(n, len): big-endian encoding of a non-negative integer. @internal */
export function i2osp(n: number, len: 1 | 2): Uint8Array {
  return len === 1 ? Uint8Array.of(n) : Uint8Array.of(n >> 8, n & 0xff);
}

/** concat(x0, ..., xN). @internal */
export const concat = concatBytes;

/** xor(a, b) for equal-length byte strings. @internal */
export function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  return a.map((x, i) => x ^ (b[i] as number));
}

const SUITES: Readonly<Record<SuiteId, Suite>> = {
  "P256-SHA256": {
    id: "P256-SHA256",
    Nh: 32,
    Npk: 33,
    Noe: 33,
    Nok: 32,
    hash: sha256,
    oprf: p256_oprf.oprf,
    group: p256.Point as unknown as Group,
    hashToGroup: p256_hasher.hashToCurve as Suite["hashToGroup"],
    blindDst: utf8("HashToGroup-OPRFV1-\x00-P256-SHA256"),
  },
  "ristretto255-SHA512": {
    id: "ristretto255-SHA512",
    Nh: 64,
    Npk: 32,
    Noe: 32,
    Nok: 32,
    hash: sha512,
    oprf: ristretto255_oprf.oprf,
    group: ristretto255.Point as unknown as Group,
    hashToGroup: ristretto255_hasher.hashToCurve as Suite["hashToGroup"],
    blindDst: utf8("HashToGroup-OPRFV1-\x00-ristretto255-SHA512"),
  },
};

/** Look up a configuration, rejecting unknown identifiers. @internal */
export function getSuite(id: SuiteId): Suite {
  const suite = Object.hasOwn(SUITES, id) ? SUITES[id] : undefined;
  if (suite === undefined) {
    throw new CryptoError(
      `Unsupported OPAQUE suite: ${String(id)}`,
      OpaqueErrorCode.INVALID_INPUT,
    );
  }
  return suite;
}

/** Extract(salt, ikm): HKDF-Extract. @internal */
export function kdfExtract(s: Suite, salt: Uint8Array, ikm: Uint8Array) {
  return extract(s.hash, ikm, salt);
}

/** Expand(prk, info, L): HKDF-Expand. @internal */
export function kdfExpand(
  s: Suite,
  prk: Uint8Array,
  info: Uint8Array,
  length: number,
): Uint8Array {
  return expand(s.hash, prk, info, length);
}

/** MAC(key, msg): HMAC. @internal */
export function mac(s: Suite, key: Uint8Array, msg: Uint8Array): Uint8Array {
  return hmac(s.hash, key, msg);
}

/**
 * DeserializeElement with the RFC 9807 § 10.7 checks: the encoding must
 * be a valid group element and not the identity.
 * @internal
 */
export function decodeElement(s: Suite, bytes: Uint8Array, label: string) {
  let element: Element;
  try {
    element = s.group.fromBytes(bytes);
  } catch {
    throw new CryptoError(`Invalid ${label}`, OpaqueErrorCode.DESERIALIZE);
  }
  if (element.equals(s.group.ZERO)) {
    throw new CryptoError(
      `Invalid ${label}: identity element`,
      OpaqueErrorCode.DESERIALIZE,
    );
  }
  return element;
}

/**
 * DeriveDiffieHellmanKeyPair(seed) = RFC 9497 DeriveKeyPair(seed,
 * "OPAQUE-DeriveDiffieHellmanKeyPair") (RFC 9807 § 6.4.1.1 and § 6.4.1.2).
 * @internal
 */
export function deriveDiffieHellmanKeyPair(s: Suite, seed: Uint8Array) {
  const kp = s.oprf.deriveKeyPair(
    seed,
    utf8("OPAQUE-DeriveDiffieHellmanKeyPair"),
  );
  return { privateKey: kp.secretKey, publicKey: kp.publicKey };
}

/**
 * DiffieHellman(k, B): validate B, multiply by the private scalar and
 * serialize. B is a valid non-identity element of a prime-order group and
 * k is non-zero, so the result is never the identity (RFC 9807 § 10.7).
 * @internal
 */
export function diffieHellman(
  s: Suite,
  privateKey: Uint8Array,
  publicKey: Uint8Array,
): Uint8Array {
  return decodeElement(s, publicKey, "public key")
    .multiply(s.group.Fn.fromBytes(privateKey))
    .toBytes();
}

/**
 * RFC 9497 Blind with a caller-chosen blind scalar: blind ·
 * HashToGroup(input). Used only to reproduce test vectors.
 * @internal
 */
export function blindWith(
  s: Suite,
  input: Uint8Array,
  blind: Uint8Array,
): Uint8Array {
  return s
    .hashToGroup(input, { DST: s.blindDst })
    .multiply(s.group.Fn.fromBytes(blind))
    .toBytes();
}
