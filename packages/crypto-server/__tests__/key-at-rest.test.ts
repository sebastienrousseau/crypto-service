/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Keys persisted under CRYPTO_KEY_OUT_DIR. The storage key was a
 * passphrase hashed once with SHA-256 (brute-forceable offline), a
 * production server wrote private keys in plaintext when no storage key
 * was set, a plaintext record was read even with encryption on (so
 * anyone able to write the directory could plant a key), and only
 * keyId and owner were authenticated with the ciphertext.
 */
import { expect } from "chai";
import { createCipheriv, randomBytes } from "crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";
import {
  KeyStore,
  KeyStoreError,
  keyStoreConfigError,
  type NewKey,
} from "../src/lib/key-store";
import { init } from "../src/server";
import { withEnv } from "./support/auth";

const HEX_KEY = "0123456789abcdef".repeat(4);
const KEY: NewKey = {
  algorithm: "ed25519",
  owner: "alice",
  publicParts: { publicKey: "aa" },
  privateParts: { privateKey: "bb" },
};

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
  } catch (e) {
    expect(e).to.be.instanceOf(KeyStoreError);
    return (e as KeyStoreError).code;
  }
  return undefined;
}

describe("keys at rest", function () {
  this.timeout(30000);
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "key-at-rest-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const record = (keyId: string) =>
    JSON.parse(readFileSync(path.join(dir, `${keyId}.json`), "utf8")) as Record<
      string,
      unknown
    >;
  const rewrite = (keyId: string, value: Record<string, unknown>) =>
    writeFileSync(path.join(dir, `${keyId}.json`), JSON.stringify(value));

  describe("storage key", () => {
    it("accepts 64 hex characters or 32 bytes", () => {
      new KeyStore(dir, 10, HEX_KEY);
      new KeyStore(dir, 10, ` ${HEX_KEY.toUpperCase()} `);
      new KeyStore(dir, 10, Buffer.alloc(32, 7));
    });

    for (const bad of [
      "my-secret-passphrase",
      HEX_KEY.slice(2),
      `${HEX_KEY}00`,
    ]) {
      it(`refuses ${JSON.stringify(bad.slice(0, 20))}… as a storage key`, () => {
        expect(() => new KeyStore(dir, 10, bad)).to.throw(/64 hex characters/);
      });
    }

    it("refuses a byte key that is not 32 bytes", () => {
      expect(() => new KeyStore(dir, 10, Buffer.alloc(16))).to.throw(
        /32 bytes/,
      );
    });
  });

  describe("configuration", () => {
    it("requires a storage key for persisted keys in production", () => {
      const prod = { NODE_ENV: "production", CRYPTO_KEY_OUT_DIR: dir };
      expect(keyStoreConfigError(prod)).to.match(/CRYPTO_KEY_STORAGE_KEY/);
      expect(
        keyStoreConfigError({ ...prod, CRYPTO_KEY_STORAGE_KEY: HEX_KEY }),
      ).to.equal(null);
      expect(
        keyStoreConfigError({ ...prod, CRYPTO_KEY_ALLOW_PLAINTEXT: "1" }),
      ).to.equal(null);
      expect(keyStoreConfigError({ NODE_ENV: "production" })).to.equal(null);
      expect(keyStoreConfigError({ CRYPTO_KEY_OUT_DIR: dir })).to.equal(null);
    });

    it("does not start with an invalid key-store setting", async () => {
      for (const env of [
        { CRYPTO_KEY_STORAGE_KEY: "a passphrase" },
        {
          NODE_ENV: "production",
          CRYPTO_KEY_OUT_DIR: dir,
          JWT_SECRET: undefined,
          CRYPTO_API_KEY: "k",
        },
      ]) {
        await withEnv(env, async () => {
          let error: Error | undefined;
          try {
            const app = await init();
            await app.close();
          } catch (e) {
            error = e as Error;
          }
          expect(error?.message, JSON.stringify(env)).to.match(
            /CRYPTO_KEY_STORAGE_KEY/,
          );
        });
      }
    });

    it("rejects a malformed storage key before startup", () => {
      expect(
        keyStoreConfigError({ CRYPTO_KEY_STORAGE_KEY: "a passphrase" }),
      ).to.match(/64 hex characters/);
    });
  });

  describe("plaintext records", () => {
    it("refuses a plaintext record when encryption is on", async () => {
      const plain = await new KeyStore(dir, 10).put(KEY);
      const encrypted = new KeyStore(dir, 10, HEX_KEY);
      expect(await codeOf(encrypted.get(plain.keyId, "alice"))).to.equal(
        "PLAINTEXT_KEY_REFUSED",
      );
    });

    it("reads a plaintext record during a migration when allowed", async () => {
      const plain = await new KeyStore(dir, 10).put(KEY);
      const migrating = new KeyStore(dir, 10, HEX_KEY, {
        acceptPlaintext: true,
      });
      const key = await migrating.get(plain.keyId, "alice");
      expect(key.privateParts).to.deep.equal({ privateKey: "bb" });
    });
  });

  describe("authenticated record", () => {
    for (const [field, value] of [
      ["algorithm", "ml-dsa-65"],
      ["publicParts", { publicKey: "cc" }],
      ["createdAt", "2020-01-01T00:00:00.000Z"],
    ] as const) {
      it(`detects a changed ${field}`, async () => {
        const stored = await new KeyStore(dir, 10, HEX_KEY).put(KEY);
        rewrite(stored.keyId, { ...record(stored.keyId), [field]: value });
        expect(
          await codeOf(
            new KeyStore(dir, 10, HEX_KEY).get(stored.keyId, "alice"),
          ),
        ).to.equal("KEY_INTEGRITY_FAILED");
      });
    }

    it("still reads records encrypted before the whole record was bound", async () => {
      const keyId = `k_${"A".repeat(22)}`;
      const iv = randomBytes(12);
      const cipher = createCipheriv(
        "aes-256-gcm",
        Buffer.from(HEX_KEY, "hex"),
        iv,
      );
      cipher.setAAD(Buffer.from(`${keyId}:alice`, "utf8"));
      const ct = Buffer.concat([
        cipher.update(JSON.stringify({ privateKey: "bb" })),
        cipher.final(),
      ]);
      rewrite(keyId, {
        keyId,
        algorithm: "ed25519",
        owner: "alice",
        createdAt: new Date().toISOString(),
        publicParts: { publicKey: "aa" },
        encryptedPrivateParts: {
          ciphertext: ct.toString("base64"),
          iv: iv.toString("base64"),
          tag: cipher.getAuthTag().toString("base64"),
          alg: "aes-256-gcm",
        },
      });
      const key = await new KeyStore(dir, 10, HEX_KEY).get(keyId, "alice");
      expect(key.privateParts).to.deep.equal({ privateKey: "bb" });
    });

    it("writes new records with the whole-record binding", async () => {
      const stored = await new KeyStore(dir, 10, HEX_KEY).put(KEY);
      const enc = record(stored.keyId)["encryptedPrivateParts"] as Record<
        string,
        unknown
      >;
      expect(enc["aad"]).to.equal("record-v2");
    });
  });
});
