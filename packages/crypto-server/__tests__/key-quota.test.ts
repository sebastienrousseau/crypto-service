/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Key store fairness. One principal could fill the in-memory store (a
 * global cap of 10,000, after which key generation failed with 503 for
 * everyone) or the disk (no cap at all), and nobody could delete a key.
 * Keys now count against a per-principal quota, owners can delete their
 * keys, and the memory cache evicts the least recently used key rather
 * than the oldest.
 */
import { expect } from "chai";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";
import type { FastifyInstance } from "fastify";
import { KeyStore, KeyStoreError, type NewKey } from "../src/lib/key-store";
import { init } from "../src/server";
import { JWT_ENV, bearer, withEnv } from "./support/auth";

const key = (owner: string): NewKey => ({
  algorithm: "ed25519",
  owner,
  publicParts: { publicKey: "aa" },
  privateParts: { privateKey: "bb" },
});

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
  } catch (e) {
    expect(e).to.be.instanceOf(KeyStoreError);
    return (e as KeyStoreError).code;
  }
  return undefined;
}

describe("key store fairness", function () {
  this.timeout(60000);

  describe("per-principal quota", () => {
    it("refuses a principal's keys beyond its quota, not others'", async () => {
      const store = new KeyStore(undefined, 100, undefined, {
        maxKeysPerOwner: 2,
      });
      await store.put(key("alice"));
      await store.put(key("alice"));
      expect(await codeOf(store.put(key("alice")))).to.equal(
        "KEY_QUOTA_EXCEEDED",
      );
      await store.put(key("bob"));
    });

    it("frees quota when a key is deleted", async () => {
      const store = new KeyStore(undefined, 100, undefined, {
        maxKeysPerOwner: 1,
      });
      const first = await store.put(key("alice"));
      await store.delete(first.keyId, "alice");
      await store.put(key("alice"));
    });
  });

  describe("delete", () => {
    let dir: string;
    beforeEach(() => {
      dir = mkdtempSync(path.join(tmpdir(), "key-delete-"));
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it("removes an owner's key from memory and disk", async () => {
      const store = new KeyStore(dir);
      const k = await store.put(key("alice"));
      const file = path.join(dir, `${k.keyId}.json`);
      expect(existsSync(file)).to.equal(true);
      await store.delete(k.keyId, "alice");
      expect(existsSync(file)).to.equal(false);
      expect(await codeOf(store.get(k.keyId, "alice"))).to.equal(
        "KEY_NOT_FOUND",
      );
      expect(await codeOf(new KeyStore(dir).get(k.keyId, "alice"))).to.equal(
        "KEY_NOT_FOUND",
      );
    });

    it("deletes a key created before a restart", async () => {
      const k = await new KeyStore(dir).put(key("alice"));
      const restarted = new KeyStore(dir);
      await restarted.delete(k.keyId, "alice");
      expect(existsSync(path.join(dir, `${k.keyId}.json`))).to.equal(false);
    });

    it("answers not found for another principal's key or an unknown key", async () => {
      const store = new KeyStore(dir);
      const k = await store.put(key("alice"));
      expect(await codeOf(store.delete(k.keyId, "bob"))).to.equal(
        "KEY_NOT_FOUND",
      );
      expect(
        await codeOf(store.delete(`k_${"A".repeat(22)}`, "alice")),
      ).to.equal("KEY_NOT_FOUND");
      expect(existsSync(path.join(dir, `${k.keyId}.json`))).to.equal(true);
    });
  });

  describe("memory cache", () => {
    it("evicts the least recently used key, not the oldest", async () => {
      const dir = mkdtempSync(path.join(tmpdir(), "key-lru-"));
      try {
        const store = new KeyStore(dir, 2);
        const a = await store.put(key("alice"));
        const b = await store.put(key("alice"));
        await store.get(a.keyId, "alice");
        await store.put(key("alice"));
        const cached = (store as unknown as { keys: Map<string, unknown> })
          .keys;
        expect(cached.has(a.keyId)).to.equal(true);
        expect(cached.has(b.keyId)).to.equal(false);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe("routes", () => {
    let app: FastifyInstance;
    before(async () => {
      await withEnv(
        { ...JWT_ENV, KEY_STORE_MAX_PER_PRINCIPAL: "2" },
        async () => {
          app = await init({ logger: false });
        },
      );
    });
    after(async () => {
      await app.close();
    });
    const post = (url: string, payload: object, who: string) =>
      withEnv(JWT_ENV, () =>
        app.inject({
          method: "POST",
          url,
          payload,
          headers: bearer(who, ["crypto:keys"]),
        }),
      );

    it("enforces the quota and lets the owner delete a key", async () => {
      const gen = () =>
        post("/v2/keys/generate", { algorithm: "ed25519" }, "carol");
      const first = await gen();
      await gen();
      const third = await gen();
      expect(third.statusCode).to.equal(429);
      expect(third.json().code).to.equal("KEY_QUOTA_EXCEEDED");

      const keyId = first.json().data.keyId;
      expect(
        (await post("/v2/keys/delete", { keyId }, "dave")).statusCode,
      ).to.equal(404);
      const del = await post("/v2/keys/delete", { keyId }, "carol");
      expect(del.statusCode).to.equal(200);
      expect(del.json().data).to.deep.equal({ keyId, deleted: true });
      expect((await gen()).statusCode).to.equal(200);
    });
  });
});
