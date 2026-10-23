/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Differential tests for the native KDF back end: Argon2, scrypt and
// PBKDF2 must return noble's bytes, run natively for the parameters
// Node.js supports, and leave everything else, errors included, to noble.
import { expect } from "chai";
import {
  argon2d as nobleArgon2d,
  argon2i as nobleArgon2i,
  argon2id as nobleArgon2id,
} from "@noble/hashes/argon2.js";
import { pbkdf2 as noblePbkdf2 } from "@noble/hashes/pbkdf2.js";
import { scrypt as nobleScrypt } from "@noble/hashes/scrypt.js";
import { sha256, sha384, sha512 } from "@noble/hashes/sha2.js";
import { sha3_256 } from "@noble/hashes/sha3.js";
import * as kdf from "../../src/accel/kdf-backend";
import { runtimeCrypto } from "../../src/accel/runtime";

// Node.js 24.7+ has argon2Sync; Node.js 22 runs Argon2 on noble.
// Coverage, enforced on Node.js 24, proves the native path ran there.
const NATIVE_ARGON2 = typeof runtimeCrypto()?.argon2Sync === "function";

const password = "correct horse battery staple";
const salt = new Uint8Array(16).fill(7);
const thrown = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as Error).message;
  }
  return "no error";
};

describe("native KDF back end", function () {
  this.timeout(60000);

  it("returns noble's Argon2 bytes, natively", () => {
    const before = kdf.nativeKdfFallbacks();
    const opts = { t: 2, m: 1024, p: 2, dkLen: 32 };
    for (const [ours, theirs] of [
      [kdf.argon2id, nobleArgon2id],
      [kdf.argon2i, nobleArgon2i],
      [kdf.argon2d, nobleArgon2d],
    ] as const) {
      expect(ours(password, salt, opts)).to.deep.equal(
        theirs(password, salt, opts),
      );
    }
    expect(kdf.argon2id(password, salt, { t: 1, m: 256, p: 1 })).to.deep.equal(
      nobleArgon2id(password, salt, { t: 1, m: 256, p: 1 }),
    );
    expect(kdf.nativeKdfFallbacks()).to.equal(before);
  });

  it("leaves Argon2 options Node.js lacks to noble", () => {
    const opts = { t: 1, m: 256, p: 1, key: new Uint8Array(8).fill(1) };
    expect(kdf.argon2id(password, salt, opts)).to.deep.equal(
      nobleArgon2id(password, salt, opts),
    );
    const odd = { t: "1", m: 256, p: 1 } as unknown as { t: number };
    expect(thrown(() => kdf.argon2id(password, salt, odd))).to.equal(
      thrown(() => nobleArgon2id(password, salt, odd)),
    );
    // Without options noble uses its own (slow) defaults; a salt it refuses
    // makes it fail before doing that work.
    const short = new Uint8Array(4);
    expect(thrown(() => kdf.argon2id(password, short, undefined))).to.equal(
      thrown(() => nobleArgon2id(password, short, undefined)),
    );
  });

  it("refuses Argon2 parameters noble refuses, with noble's error", () => {
    const before = kdf.nativeKdfFallbacks();
    const opts = { t: 1, m: 4, p: 1 };
    expect(thrown(() => kdf.argon2id(password, salt, opts))).to.equal(
      thrown(() => nobleArgon2id(password, salt, opts)),
    );
    // Natively, the refused costs throw and are repeated with noble.
    expect(kdf.nativeKdfFallbacks() - before).to.equal(NATIVE_ARGON2 ? 1 : 0);
  });

  it("returns noble's scrypt bytes, natively", () => {
    const before = kdf.nativeKdfFallbacks();
    const opts = { N: 1024, r: 8, p: 1, dkLen: 32 };
    expect(kdf.scrypt(password, salt, opts)).to.deep.equal(
      nobleScrypt(password, salt, opts),
    );
    expect(
      kdf.scrypt(password, salt, { N: 1024, r: 8, p: 1, maxmem: 2 ** 24 }),
    ).to.deep.equal(nobleScrypt(password, salt, { N: 1024, r: 8, p: 1 }));
    expect(kdf.nativeKdfFallbacks()).to.equal(before);
  });

  it("leaves scrypt progress callbacks and bad costs to noble", () => {
    const opts = { N: 1024, r: 8, p: 1, onProgress: () => undefined };
    expect(kdf.scrypt(password, salt, opts)).to.deep.equal(
      nobleScrypt(password, salt, { N: 1024, r: 8, p: 1 }),
    );
    const bad = { N: 1000, r: 8, p: 1 };
    expect(thrown(() => kdf.scrypt(password, salt, bad))).to.equal(
      thrown(() => nobleScrypt(password, salt, bad)),
    );
  });

  it("returns noble's PBKDF2 bytes, natively for SHA-2", () => {
    const before = kdf.nativeKdfFallbacks();
    for (const hash of [sha256, sha384, sha512]) {
      expect(kdf.pbkdf2(hash, password, salt, { c: 1000 })).to.deep.equal(
        noblePbkdf2(hash, password, salt, { c: 1000 }),
      );
    }
    expect(kdf.nativeKdfFallbacks()).to.equal(before);
    expect(
      kdf.pbkdf2(sha3_256, password, salt, { c: 1000, dkLen: 16 }),
    ).to.deep.equal(
      noblePbkdf2(sha3_256, password, salt, { c: 1000, dkLen: 16 }),
    );
    expect(thrown(() => kdf.pbkdf2(sha256, password, salt, { c: 0 }))).to.equal(
      thrown(() => noblePbkdf2(sha256, password, salt, { c: 0 })),
    );
  });
});
