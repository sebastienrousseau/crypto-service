/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Post-quantum primitives with a native back end.
 *
 * Each export has the shape of the matching `@noble/post-quantum` object
 * and the same raw key, ciphertext and signature formats. Where the
 * Node.js runtime implements the algorithm (OpenSSL 3.5 in Node.js 24.7
 * and later: ML-KEM, ML-DSA and SLH-DSA), key generation, encapsulation,
 * decapsulation, signing and verification run natively, 3 to 20 times
 * faster; elsewhere, and for anything this module does not route, the
 * noble object answers. Raw keys cross into OpenSSL in DER wrappers whose
 * algorithm identifier is taken from a key OpenSSL generates itself, so
 * no object identifier is written down here.
 *
 * A native call that throws, for a malformed key for instance, is
 * repeated with noble, so errors, and the inputs that are refused, are
 * noble's. Results are interchangeable: a key from one back end works
 * with the other, and differential tests check it.
 */

import type * as NodeCrypto from "node:crypto";
import type { KeyObject } from "node:crypto";
import { runtimeCrypto } from "./runtime";
import {
  ml_kem512 as nobleMlKem512,
  ml_kem768 as nobleMlKem768,
  ml_kem1024 as nobleMlKem1024,
} from "@noble/post-quantum/ml-kem.js";
import {
  ml_dsa44 as nobleMlDsa44,
  ml_dsa65 as nobleMlDsa65,
  ml_dsa87 as nobleMlDsa87,
} from "@noble/post-quantum/ml-dsa.js";
import {
  slh_dsa_sha2_128f as nobleSlhSha2_128f,
  slh_dsa_sha2_128s as nobleSlhSha2_128s,
  slh_dsa_sha2_192f as nobleSlhSha2_192f,
  slh_dsa_sha2_192s as nobleSlhSha2_192s,
  slh_dsa_sha2_256f as nobleSlhSha2_256f,
  slh_dsa_sha2_256s as nobleSlhSha2_256s,
  slh_dsa_shake_128f as nobleSlhShake128f,
  slh_dsa_shake_128s as nobleSlhShake128s,
  slh_dsa_shake_192f as nobleSlhShake192f,
  slh_dsa_shake_192s as nobleSlhShake192s,
  slh_dsa_shake_256f as nobleSlhShake256f,
  slh_dsa_shake_256s as nobleSlhShake256s,
} from "@noble/post-quantum/slh-dsa.js";
import { concat } from "../encoding";

/** Node.js's `crypto`, when this runtime has it. */
const nodeCrypto = runtimeCrypto();

// --- DER ---

/** DER length octets. */
function derLength(n: number): Uint8Array {
  if (n < 0x80) return Uint8Array.of(n);
  if (n < 0x100) return Uint8Array.of(0x81, n);
  return Uint8Array.of(0x82, n >> 8, n & 0xff);
}

/** A DER TLV. */
function tlv(tag: number, body: Uint8Array): Uint8Array {
  return concat([Uint8Array.of(tag), derLength(body.length), body]);
}

/** Whether `der` ends with an OCTET STRING of exactly `length` bytes. */
function endsWithOctetString(der: Uint8Array, length: number): boolean {
  const lengthBytes = derLength(length);
  const at = der.length - length - lengthBytes.length - 1;
  return (
    at >= 0 &&
    der[at] === 0x04 &&
    Buffer.from(der.subarray(at + 1, at + 1 + lengthBytes.length)).equals(
      lengthBytes,
    )
  );
}

/** How OpenSSL wraps one algorithm's raw keys. */
export interface DerForm {
  /** SPKI `AlgorithmIdentifier`, as OpenSSL writes it. */
  algorithm: Uint8Array;
  /** Whether the PKCS#8 private key holds the raw key in an inner OCTET STRING. */
  innerOctetString: boolean;
}

/** SPKI DER for a raw public key. */
function spki(form: DerForm, publicKey: Uint8Array): Uint8Array {
  const bits = concat([Uint8Array.of(0), publicKey]);
  return tlv(0x30, concat([form.algorithm, tlv(0x03, bits)]));
}

/** PKCS#8 DER for a raw (expanded) secret key. */
function pkcs8(form: DerForm, secretKey: Uint8Array): Uint8Array {
  const key = form.innerOctetString ? tlv(0x04, secretKey) : secretKey;
  return tlv(
    0x30,
    concat([tlv(0x02, Uint8Array.of(0)), form.algorithm, tlv(0x04, key)]),
  );
}

/** Header size and content length of the DER TLV at `offset`. */
function tlvAt(
  der: Uint8Array,
  offset: number,
): { header: number; length: number } {
  const first = der[offset + 1]!;
  if (first < 0x80) return { header: 2, length: first };
  const octets = first & 0x7f;
  let length = 0;
  for (let i = 0; i < octets; i++) length = length * 256 + der[offset + 2 + i]!;
  return { header: 2 + octets, length };
}

/** The `AlgorithmIdentifier` TLV that opens an SPKI body. */
function algorithmOf(spkiDer: Uint8Array): Uint8Array {
  const start = tlvAt(spkiDer, 0).header;
  const algorithm = tlvAt(spkiDer, start);
  return spkiDer.subarray(start, start + algorithm.header + algorithm.length);
}

// --- Native detection ---

/** Raw key sizes of one algorithm, in bytes. */
export interface Sizes {
  publicKey: number;
  secretKey: number;
}

/** A native algorithm: its OpenSSL name, DER form and raw key sizes. */
export interface Native extends Sizes {
  name: string;
  form: DerForm;
  /** Whether native key generation yields the expanded secret key. */
  keygen: boolean;
}

/** A raw key pair from noble, used to check the runtime reads it alike. */
export type Expand = () => { publicKey: Uint8Array; secretKey: Uint8Array };

/**
 * The native form of `name`, or undefined when the runtime lacks it.
 * Probed once, on first use. `innerOctetString` is the standard's PKCS#8
 * layout: ML-KEM and ML-DSA keys are the `expandedKey` choice, an OCTET
 * STRING inside the PKCS#8 privateKey; SLH-DSA keys are the raw key
 * itself (RFC 9909).
 *
 * A runtime that exports private keys as the seed alone (Node.js 24.22+
 * and 26 for ML-KEM and ML-DSA) cannot hand back the expanded secret key
 * from native key generation, which stays with noble; it still runs
 * every other operation natively if it reads an expanded key from
 * `expand` as noble does.
 */
export function probe(
  name: string,
  sizes: Sizes,
  innerOctetString: boolean,
  crypto: typeof NodeCrypto | null = nodeCrypto,
  expand?: Expand,
): Native | undefined {
  if (crypto === null) return undefined;
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync(
      name as "ed25519",
    );
    const spkiDer = publicKey.export({ format: "der", type: "spki" });
    const pkcs8Der = privateKey.export({ format: "der", type: "pkcs8" });
    const form = { algorithm: algorithmOf(spkiDer), innerOctetString };
    const native = { name, form, keygen: true, ...sizes };
    if (endsWithOctetString(pkcs8Der, sizes.secretKey)) return native;
    return expand && readsLikeNoble(crypto, native, expand())
      ? { ...native, keygen: false }
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Whether the runtime takes noble's expanded secret key and derives
 * noble's public key from it. Throws when it refuses the key.
 */
function readsLikeNoble(
  crypto: typeof NodeCrypto,
  native: Native,
  pair: ReturnType<Expand>,
): boolean {
  const privateKey = crypto.createPrivateKey({
    key: Buffer.from(pkcs8(native.form, pair.secretKey)),
    format: "der",
    type: "pkcs8",
  });
  const spkiDer = crypto
    .createPublicKey(privateKey)
    .export({ format: "der", type: "spki" });
  return Buffer.from(spkiDer.subarray(-native.publicKey)).equals(
    Buffer.from(pair.publicKey),
  );
}

/** Algorithms probed so far, and whether each runs natively. */
const nativeByName = new Map<string, boolean>();

/** The lazy probe of every algorithm this module routes. */
const PROBES: Array<() => Native | undefined> = [];

/** Probes `name` lazily and caches the outcome. */
function lazyNative(
  name: string,
  sizes: Sizes,
  innerOctetString: boolean,
  expand: Expand,
): () => Native | undefined {
  let probed = false;
  let native: Native | undefined;
  const get = (): Native | undefined => {
    if (!probed) {
      native = probe(name, sizes, innerOctetString, nodeCrypto, expand);
      probed = true;
      nativeByName.set(name, native !== undefined);
    }
    return native;
  };
  PROBES.push(get);
  return get;
}

/** Native calls that threw and were repeated with noble. */
let fallbacks = 0;

/**
 * How many native calls have thrown and been repeated with noble. Valid
 * input never falls back, so tests use it to prove the native path ran.
 */
export function nativeFallbacks(): number {
  return fallbacks;
}

/** Runs `fast`, and `slow` when `fast` is unavailable or throws. */
function nativeOr<T>(fast: (() => T) | undefined, slow: () => T): T {
  if (fast) {
    try {
      return fast();
    } catch {
      // Malformed input: noble produces the result or the error.
      fallbacks += 1;
    }
  }
  return slow();
}

/** Raw public and secret keys of a native key pair. */
function rawKeyPair(native: Native): {
  publicKey: Uint8Array<ArrayBuffer>;
  secretKey: Uint8Array<ArrayBuffer>;
} {
  const { publicKey, privateKey } = nodeCrypto!.generateKeyPairSync(
    native.name as "ed25519",
  );
  const spkiDer = publicKey.export({ format: "der", type: "spki" });
  const pkcs8Der = privateKey.export({ format: "der", type: "pkcs8" });
  return {
    publicKey: new Uint8Array(spkiDer.subarray(-native.publicKey)),
    secretKey: new Uint8Array(pkcs8Der.subarray(-native.secretKey)),
  };
}

/**
 * Native key generation, where the runtime has the algorithm and exports
 * the expanded secret key; noble for a seeded key pair.
 */
function nativeKeygen(
  native: () => Native | undefined,
  seed: Uint8Array | undefined,
): (() => ReturnType<typeof rawKeyPair>) | undefined {
  const n = seed === undefined ? native() : undefined;
  return n?.keygen ? () => rawKeyPair(n) : undefined;
}

/** A key pair from noble's fixed all-zero seed, for {@link probe}. */
const expandWith =
  (noble: {
    keygen: (seed: Uint8Array) => ReturnType<Expand>;
    lengths: { seed?: number };
  }): Expand =>
  () =>
    noble.keygen(new Uint8Array(noble.lengths.seed!));

/** Imports a raw public key. */
function publicKeyObject(native: Native, key: Uint8Array): KeyObject {
  return nodeCrypto!.createPublicKey({
    key: Buffer.from(spki(native.form, key)),
    format: "der",
    type: "spki",
  });
}

/** Imports a raw (expanded) secret key. */
function privateKeyObject(native: Native, key: Uint8Array): KeyObject {
  return nodeCrypto!.createPrivateKey({
    key: Buffer.from(pkcs8(native.form, key)),
    format: "der",
    type: "pkcs8",
  });
}

// --- KEM ---

/** The noble ML-KEM object shape. */
type NobleKem = typeof nobleMlKem768;

/** An ML-KEM object that runs natively where it can. */
function kem(noble: NobleKem, name: string): NobleKem {
  const native = lazyNative(
    name,
    {
      publicKey: noble.lengths.publicKey!,
      secretKey: noble.lengths.secretKey!,
    },
    true,
    expandWith(noble),
  );
  return {
    ...noble,
    keygen(seed?: Uint8Array) {
      return nativeOr(nativeKeygen(native, seed), () => noble.keygen(seed));
    },
    encapsulate(publicKey: Uint8Array, msg?: Uint8Array) {
      const n = msg === undefined ? native() : undefined;
      return nativeOr(
        n &&
          (() => {
            const out = nodeCrypto!.encapsulate(publicKeyObject(n, publicKey));
            return {
              cipherText: new Uint8Array(out.ciphertext),
              sharedSecret: new Uint8Array(out.sharedKey),
            };
          }),
        () => noble.encapsulate(publicKey, msg),
      );
    },
    decapsulate(cipherText: Uint8Array, secretKey: Uint8Array) {
      const n = native();
      return nativeOr(
        n &&
          (() =>
            new Uint8Array(
              nodeCrypto!.decapsulate(
                privateKeyObject(n, secretKey),
                Buffer.from(cipherText),
              ),
            )),
        () => noble.decapsulate(cipherText, secretKey),
      );
    },
  };
}

// --- Signatures ---

/** The noble signature object shape (ML-DSA and SLH-DSA). */
type NobleSigner = Pick<
  typeof nobleMlDsa65,
  "keygen" | "sign" | "verify" | "lengths"
>;

/** A signature object that runs natively where it can. */
function signer<S extends NobleSigner>(
  noble: S,
  name: string,
  innerOctetString: boolean,
): S {
  const native = lazyNative(
    name,
    {
      publicKey: noble.lengths.publicKey!,
      secretKey: noble.lengths.secretKey!,
    },
    innerOctetString,
    expandWith(noble),
  );
  return {
    ...noble,
    keygen(seed?: Uint8Array) {
      return nativeOr(nativeKeygen(native, seed), () => noble.keygen(seed));
    },
    sign(msg: Uint8Array, secretKey: Uint8Array, opts?: object) {
      const n = opts === undefined ? native() : undefined;
      return nativeOr(
        n &&
          (() =>
            new Uint8Array(
              nodeCrypto!.sign(null, msg, privateKeyObject(n, secretKey)),
            )),
        () => noble.sign(msg, secretKey, opts),
      );
    },
    verify(
      sig: Uint8Array,
      msg: Uint8Array,
      publicKey: Uint8Array,
      opts?: object,
    ) {
      const n = opts === undefined ? native() : undefined;
      return nativeOr(
        n &&
          (() =>
            nodeCrypto!.verify(null, msg, publicKeyObject(n, publicKey), sig)),
        () => noble.verify(sig, msg, publicKey, opts),
      );
    },
  };
}

// --- Exports ---

/** ML-KEM-512, native where available. */
export const ml_kem512 = kem(nobleMlKem512, "ml-kem-512");
/** ML-KEM-768, native where available. */
export const ml_kem768 = kem(nobleMlKem768, "ml-kem-768");
/** ML-KEM-1024, native where available. */
export const ml_kem1024 = kem(nobleMlKem1024, "ml-kem-1024");

/** ML-DSA-44, native where available. */
export const ml_dsa44 = signer(nobleMlDsa44, "ml-dsa-44", true);
/** ML-DSA-65, native where available. */
export const ml_dsa65 = signer(nobleMlDsa65, "ml-dsa-65", true);
/** ML-DSA-87, native where available. */
export const ml_dsa87 = signer(nobleMlDsa87, "ml-dsa-87", true);

/** SLH-DSA-SHA2-128f, native where available. */
export const slh_dsa_sha2_128f = signer(
  nobleSlhSha2_128f,
  "slh-dsa-sha2-128f",
  false,
);
/** SLH-DSA-SHA2-128s, native where available. */
export const slh_dsa_sha2_128s = signer(
  nobleSlhSha2_128s,
  "slh-dsa-sha2-128s",
  false,
);
/** SLH-DSA-SHA2-192f, native where available. */
export const slh_dsa_sha2_192f = signer(
  nobleSlhSha2_192f,
  "slh-dsa-sha2-192f",
  false,
);
/** SLH-DSA-SHA2-192s, native where available. */
export const slh_dsa_sha2_192s = signer(
  nobleSlhSha2_192s,
  "slh-dsa-sha2-192s",
  false,
);
/** SLH-DSA-SHA2-256f, native where available. */
export const slh_dsa_sha2_256f = signer(
  nobleSlhSha2_256f,
  "slh-dsa-sha2-256f",
  false,
);
/** SLH-DSA-SHA2-256s, native where available. */
export const slh_dsa_sha2_256s = signer(
  nobleSlhSha2_256s,
  "slh-dsa-sha2-256s",
  false,
);
/** SLH-DSA-SHAKE-128f, native where available. */
export const slh_dsa_shake_128f = signer(
  nobleSlhShake128f,
  "slh-dsa-shake-128f",
  false,
);
/** SLH-DSA-SHAKE-128s, native where available. */
export const slh_dsa_shake_128s = signer(
  nobleSlhShake128s,
  "slh-dsa-shake-128s",
  false,
);
/** SLH-DSA-SHAKE-192f, native where available. */
export const slh_dsa_shake_192f = signer(
  nobleSlhShake192f,
  "slh-dsa-shake-192f",
  false,
);
/** SLH-DSA-SHAKE-192s, native where available. */
export const slh_dsa_shake_192s = signer(
  nobleSlhShake192s,
  "slh-dsa-shake-192s",
  false,
);
/** SLH-DSA-SHAKE-256f, native where available. */
export const slh_dsa_shake_256f = signer(
  nobleSlhShake256f,
  "slh-dsa-shake-256f",
  false,
);
/** SLH-DSA-SHAKE-256s, native where available. */
export const slh_dsa_shake_256s = signer(
  nobleSlhShake256s,
  "slh-dsa-shake-256s",
  false,
);

/**
 * The algorithms that run natively on this runtime, by OpenSSL name
 * (`"ml-kem-768"`, `"slh-dsa-shake-128f"`...). Empty where the runtime
 * has none, for example in browsers or before Node.js 24.7.
 */
export function nativeAlgorithms(): string[] {
  for (const native of PROBES) native();
  return [...nativeByName].filter(([, on]) => on).map(([name]) => name);
}
