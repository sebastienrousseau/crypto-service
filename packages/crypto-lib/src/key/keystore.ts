/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Lazy async keystore + unlocked private-key cache.
 *
 * Replaces the previous module-level `readFileSync` pattern in `./key.ts`
 * which blocked the event loop on every `import` and broke whenever the
 * process CWD differed from the package source root.
 *
 * Design:
 *  - File reads happen exactly once per process (Promise memoized).
 *  - The raw file bytes are decoded either as already-ASCII armor
 *    (`-----BEGIN ...`) or as legacy base64-wrapped armor.
 *  - Unlocked OpenPGP private keys are cached keyed on
 *    (armored-length, passphrase) so the expensive `decryptKey` call
 *    is paid once per (key, passphrase) combination — the single
 *    largest contributor to per-request latency.
 */

import { readFile } from "fs/promises";
import * as path from "path";
import * as openpgp from "openpgp";

/** Immutable container holding the three shipped PGP key artifacts. */
export interface Keystore {
  /** ASCII-armored private key. */
  readonly privateKeyArmored: string;
  /** ASCII-armored public key. */
  readonly publicKeyArmored: string;
  /** ASCII-armored revocation certificate. */
  readonly revocationArmored: string;
}

const ARMOR_BEGIN = Buffer.from("-----", "ascii");

/**
 * Decode either already-ASCII-armored or legacy base64-wrapped key bytes.
 */
export function decodeArmor(raw: Buffer): string {
  if (
    raw.length >= ARMOR_BEGIN.length &&
    raw.subarray(0, ARMOR_BEGIN.length).equals(ARMOR_BEGIN)
  ) {
    // Fast path: file is already ASCII armor, no allocation needed beyond the string.
    return raw.toString("latin1");
  }
  // Legacy path: the raw bytes are base64-encoded armor.
  return Buffer.from(raw.toString("latin1"), "base64").toString("latin1");
}

let cache: Promise<Keystore> | undefined;

/**
 * Resolve the key directory. Honours `CRYPTO_KEY_DIR` env var, falling back
 * to `<package>/src/key` relative to this compiled module.
 */
function resolveKeyDir(dir?: string): string {
  if (dir) return dir;
  if (process.env["CRYPTO_KEY_DIR"]) return process.env["CRYPTO_KEY_DIR"];
  return path.resolve(__dirname, "..", "key");
}

/**
 * Lazily load the shipped key triplet from disk. The promise is memoized, so
 * concurrent callers during startup share a single set of reads.
 */
export function loadKeystore(dir?: string): Promise<Keystore> {
  if (cache) return cache;
  const keyDir = resolveKeyDir(dir);
  cache = (async (): Promise<Keystore> => {
    const [priv, pub, cert] = await Promise.all([
      readFile(path.join(keyDir, "rsa.key")),
      readFile(path.join(keyDir, "rsa.pub")),
      readFile(path.join(keyDir, "rsa.cert")),
    ]);
    return Object.freeze({
      privateKeyArmored: decodeArmor(priv),
      publicKeyArmored: decodeArmor(pub),
      revocationArmored: decodeArmor(cert),
    });
  })();
  return cache;
}

/**
 * Clear the memoized keystore. Intended for tests only.
 */
export function _resetKeystoreForTests(): void {
  cache = undefined;
}

/**
 * Parse and decrypt an armored private key.
 *
 * Each call produces a fresh OpenPGP key object. A previous iteration
 * cached unlocked keys for throughput, but `openpgp.revokeKey` and
 * `openpgp.reformatKey` mutate (or otherwise co-own) the key material,
 * so a single cached instance is not reusable across call sites that
 * perform structural operations.  Fresh unlock preserves correctness at
 * the cost of an extra CPU-bound `decryptKey` per call; callers that
 * need pooling can memoize at their own layer.
 */
export async function unlockPrivateKey(
  armoredKey: string,
  passphrase: string,
): Promise<openpgp.PrivateKey> {
  const read = await openpgp.readPrivateKey({ armoredKey });
  return openpgp.decryptKey({ privateKey: read, passphrase });
}
