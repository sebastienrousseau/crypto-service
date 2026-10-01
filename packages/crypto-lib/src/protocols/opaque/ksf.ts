/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Key stretching functions (KSF) for OPAQUE (RFC 9807 § 2.3).
 *
 * The client stretches the OPRF output before deriving the randomized
 * password, so a stolen registration record costs one KSF evaluation per
 * password guess (RFC 9807 § 10.8). Client and server must agree on the
 * KSF and its parameters: changing them invalidates every record.
 *
 * The default is scrypt with the RFC 9807 § 7 recommended parameters
 * (S = zeroes(16), N = 32768, r = 8, p = 1, dkLen = 32), about 32 MiB of
 * memory per evaluation. The recommended Argon2id profile (m = 2^21 KiB,
 * i.e. 2 GiB) is above this library's Argon2 memory cap
 * (`MAX_ARGON2_MEMORY`, 256 MiB), so it is not offered as a default;
 * applications can supply their own {@link Ksf}.
 */

import { scrypt } from "@noble/hashes/scrypt.js";
import { checkScryptCosts } from "../../modern/cost-limits";

/** A key stretching function: Stretch(msg), slow and collision resistant. */
export interface Ksf {
  /** Human-readable name including the parameters, e.g. `scrypt(N=32768,r=8,p=1)`. */
  readonly name: string;
  /** Stretch the OPRF output. Must be deterministic. */
  stretch(msg: Uint8Array): Uint8Array;
}

/** scrypt parameters for {@link scryptKsf}. */
export interface ScryptKsfParams {
  /** CPU/memory cost (power of two). */
  N: number;
  /** Block size. */
  r: number;
  /** Parallelism. */
  p: number;
  /** Output length in bytes. */
  dkLen: number;
}

/** RFC 9807 § 7 recommended scrypt parameters (salt is zeroes(16)). */
export const RFC9807_SCRYPT_PARAMS: Readonly<ScryptKsfParams> = Object.freeze({
  N: 32768,
  r: 8,
  p: 1,
  dkLen: 32,
});

/**
 * scrypt as an OPAQUE KSF, with a fixed all-zero 16-byte salt as RFC 9807
 * § 7 specifies (the OPRF output is already unique per user and server).
 *
 * @param params - Overrides of {@link RFC9807_SCRYPT_PARAMS}; costs are
 *   checked against the library caps in `modern/cost-limits`.
 */
export function scryptKsf(params: Partial<ScryptKsfParams> = {}): Ksf {
  const { N, r, p, dkLen } = { ...RFC9807_SCRYPT_PARAMS, ...params };
  checkScryptCosts(N, r, p);
  const salt = new Uint8Array(16);
  return Object.freeze({
    name: `scrypt(N=${N},r=${r},p=${p},dkLen=${dkLen})`,
    stretch: (msg: Uint8Array) => scrypt(msg, salt, { N, r, p, dkLen }),
  });
}

/**
 * The Identity KSF, Stretch(msg) = msg, used by the RFC 9807 Appendix C
 * test vectors. It offers no protection for stolen records; never use it
 * outside tests.
 * @internal
 */
export const identityKsf: Ksf = Object.freeze({
  name: "Identity",
  stretch: (msg: Uint8Array) => msg.slice(),
});

/** Default KSF: scrypt with the RFC 9807 recommended parameters. @internal */
export const DEFAULT_KSF: Ksf = scryptKsf();
