/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Argon2, scrypt and PBKDF2 with a native back end.
 *
 * Each export takes the arguments of the matching `@noble/hashes`
 * function and returns the same bytes. Where Node.js implements the
 * function (`argon2Sync` from Node.js 24.7, `scryptSync` and
 * `pbkdf2Sync`), it runs there: measured on an Apple A18 Pro with
 * Node.js 24.21, Argon2id at t=3, m=64 MiB, p=4 takes about 45 ms instead
 * of 500, and PBKDF2-SHA256 at 600,000 iterations about 55 ms instead of
 * 400. Options noble has and Node.js lacks (a secret key, associated
 * data, progress callbacks) and a native call that throws go to noble, so
 * parameters noble refuses are refused with noble's error.
 */

import {
  argon2d as nobleArgon2d,
  argon2i as nobleArgon2i,
  argon2id as nobleArgon2id,
} from "@noble/hashes/argon2.js";
import { pbkdf2 as noblePbkdf2 } from "@noble/hashes/pbkdf2.js";
import { scrypt as nobleScrypt } from "@noble/hashes/scrypt.js";
import { sha256, sha384, sha512 } from "@noble/hashes/sha2.js";
import { runtimeCrypto } from "./runtime";

/** Node.js's `crypto`, when this runtime has it. */
const nodeCrypto = runtimeCrypto();

/** A password or salt: bytes, or a string read as UTF-8. */
export type Input = string | Uint8Array;

/** Native calls that threw and were repeated with noble. */
let fallbacks = 0;

/** How many native KDF calls have thrown and been repeated with noble. */
export function nativeKdfFallbacks(): number {
  return fallbacks;
}

/** Runs `fast`, and `slow` when `fast` is unavailable or throws. */
function nativeOr<T>(fast: (() => T) | undefined, slow: () => T): T {
  if (fast) {
    try {
      return fast();
    } catch {
      fallbacks += 1;
    }
  }
  return slow();
}

/** Whether `opts` names only `allowed` options. */
function only(opts: object, allowed: readonly string[]): boolean {
  return Object.keys(opts).every((key) => allowed.includes(key));
}

// --- Argon2 ---

/** The options of noble's Argon2 functions. */
export type Argon2Opts = Parameters<typeof nobleArgon2id>[2];

/** An Argon2 function: noble's arguments, noble's bytes. */
export type Argon2Fn = (
  password: Input,
  salt: Input,
  opts: Argon2Opts,
) => Uint8Array;

/** Node.js's Argon2 cost parameters for `opts`, or undefined when it cannot run them. */
function argon2Costs(
  opts: Argon2Opts,
):
  | { passes: number; memory: number; parallelism: number; tagLength: number }
  | undefined {
  const { t, m, p, dkLen } = (opts ?? {}) as Record<string, unknown>;
  const costs = [t, m, p, dkLen ?? 32];
  if (!only(opts ?? {}, ["t", "m", "p", "dkLen"])) return undefined;
  if (!costs.every((n) => typeof n === "number")) return undefined;
  const [passes, memory, parallelism, tagLength] = costs as number[];
  return {
    passes: passes!,
    memory: memory!,
    parallelism: parallelism!,
    tagLength: tagLength!,
  };
}

/** An Argon2 variant that runs natively where it can. */
function argon2(
  variant: "argon2id" | "argon2i" | "argon2d",
  noble: typeof nobleArgon2id,
): Argon2Fn {
  return (password: Input, salt: Input, opts: Argon2Opts) => {
    const costs = argon2Costs(opts);
    return nativeOr(
      nodeCrypto?.argon2Sync && costs
        ? () =>
            new Uint8Array(
              nodeCrypto.argon2Sync(variant, {
                message: password,
                nonce: salt,
                ...costs,
              }),
            )
        : undefined,
      () => noble(password, salt, opts),
    );
  };
}

/** Argon2id, native where available. */
export const argon2id = argon2("argon2id", nobleArgon2id);
/** Argon2i, native where available. */
export const argon2i = argon2("argon2i", nobleArgon2i);
/** Argon2d, native where available. */
export const argon2d = argon2("argon2d", nobleArgon2d);

// --- scrypt ---

/** noble's scrypt memory limit when the caller sets none (1 GiB). */
const SCRYPT_MAXMEM = 1024 ** 3;

/** scrypt, native where available. */
export const scrypt: typeof nobleScrypt = (password, salt, opts) =>
  nativeOr(
    nodeCrypto && only(opts, ["N", "r", "p", "dkLen", "maxmem"])
      ? () =>
          new Uint8Array(
            nodeCrypto.scryptSync(password, salt, opts.dkLen ?? 32, {
              N: opts.N,
              r: opts.r,
              p: opts.p,
              maxmem: opts.maxmem ?? SCRYPT_MAXMEM,
            }),
          )
      : undefined,
    () => nobleScrypt(password, salt, opts),
  );

// --- PBKDF2 ---

/** Node.js digest names of the noble hashes PBKDF2 can run natively. */
const DIGESTS = new Map<unknown, string>([
  [sha256, "sha256"],
  [sha384, "sha384"],
  [sha512, "sha512"],
]);

/** PBKDF2, native where available. */
export const pbkdf2: typeof noblePbkdf2 = (hash, password, salt, opts) => {
  const digest = DIGESTS.get(hash);
  return nativeOr(
    nodeCrypto && digest && only(opts, ["c", "dkLen"])
      ? () =>
          new Uint8Array(
            nodeCrypto.pbkdf2Sync(
              password,
              salt,
              opts.c,
              opts.dkLen ?? 32,
              digest,
            ),
          )
      : undefined,
    () => noblePbkdf2(hash, password, salt, opts),
  );
};
