/**
 * Server-side key custody (audit findings F28, F29).
 *
 * Before this change the API took raw private keys in request bodies
 * (/v1/decrypt, /v2/sign, /v2/stream/sign, sealed-box open, PQ sign and
 * decapsulate) and returned them from every key-generation route.
 */
import { expect } from "chai";
import fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";
import {
  ed25519Sign,
  ed25519Verify,
} from "@sebastienrousseau/crypto-lib/modern";
import routes from "../src/routes";
import { init } from "../src/server";
import { hasScope } from "../src/lib/auth";
import {
  KeyStore,
  KeyStoreError,
  keyStoreFromEnv,
  type NewKey,
} from "../src/lib/key-store";

/** Field names that carry private key material. */
const PRIVATE_FIELD = /(private|secret)[-_]?key/i;

/** Every property name declared anywhere in a JSON schema. */
function schemaFields(schema: unknown): string[] {
  if (schema === null || typeof schema !== "object") return [];
  const node = schema as Record<string, unknown>;
  const own = Object.keys((node["properties"] as object | undefined) ?? {});
  const children = [
    ...Object.values((node["properties"] as object | undefined) ?? {}),
    node["items"],
  ];
  return [...own, ...children.flatMap(schemaFields)];
}

/** Every key anywhere in a JSON value. */
function jsonKeys(value: unknown): string[] {
  if (value === null || typeof value !== "object") return [];
  const entries = Object.entries(value as object);
  return entries.flatMap(([k, v]) => [k, ...jsonKeys(v)]);
}

/** Run `fn` with env overrides, restoring the previous values after. */
async function withEnv<T>(
  vars: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const saved = Object.fromEntries(
    Object.keys(vars).map((k) => [k, process.env[k]]),
  );
  const apply = (v: Record<string, string | undefined>): void => {
    for (const [k, val] of Object.entries(v)) {
      if (val === undefined) delete process.env[k];
      else process.env[k] = val;
    }
  };
  apply(vars);
  try {
    return await fn();
  } finally {
    apply(saved);
  }
}

const KEY: NewKey = {
  algorithm: "ed25519",
  owner: "alice",
  publicParts: { publicKey: "aa" },
  privateParts: { privateKey: "bb" },
};

describe("Server-side key custody (F28, F29)", function () {
  this.timeout(30000);

  describe("request schemas", () => {
    it("no route accepts a private or secret key field", async () => {
      const app = fastify();
      const offenders: string[] = [];
      let checked = 0;
      app.addHook("onRoute", (route) => {
        const body = (route.schema as { body?: unknown } | undefined)?.body;
        checked += 1;
        for (const field of schemaFields(body)) {
          if (PRIVATE_FIELD.test(field)) {
            offenders.push(`${String(route.method)} ${route.url}: ${field}`);
          }
        }
      });
      await app.register(async (scope) => {
        routes(scope);
      });
      await app.ready();
      await app.close();
      expect(checked).to.be.greaterThan(40);
      expect(offenders).to.deep.equal([]);
    });

    it("the field detector catches the names the old schemas used", () => {
      const old = {
        properties: {
          privateKey: {},
          items: {
            items: { properties: { x25519PrivateKey: {}, secretKey: {} } },
          },
          recipientSecretKey: {},
        },
      };
      expect(
        schemaFields(old).filter((f) => PRIVATE_FIELD.test(f)),
      ).to.have.length(4);
    });
  });

  describe("key generation responses", () => {
    let app: FastifyInstance;
    before(async () => {
      app = await init();
    });
    after(async () => {
      await app.close();
    });

    const keygens: Array<[string, object]> = [
      ["/v2/keys/generate", { algorithm: "ed25519" }],
      ["/v2/keys/generate", { algorithm: "ml-kem-768" }],
      ["/v2/pq/keygen", {}],
      ["/v2/pq/hybrid/keygen", {}],
      ["/v2/pq/dsa/keygen", { level: 44 }],
      ["/v2/pq/slh-dsa/keygen", { variant: "shake-128f" }],
    ];
    for (const [url, payload] of keygens) {
      it(`${url} ${JSON.stringify(payload)} returns a keyId, no private key`, async () => {
        const res = await app.inject({ method: "POST", url, payload });
        expect(res.statusCode).to.equal(200);
        const body = res.json();
        expect(body.data.keyId).to.match(/^k_[A-Za-z0-9_-]{22}$/);
        expect(
          jsonKeys(body).filter((k) => /private|secret/i.test(k)),
        ).to.deep.equal([]);
      });
    }
  });

  describe("export", () => {
    const JWT_ONLY = {
      JWT_SECRET: "e".repeat(32),
      CRYPTO_API_KEY: undefined,
      ALLOW_ANONYMOUS: undefined,
    };

    /** Sign a one-hour token for `sub` with `scopes`. */
    const token = (app: FastifyInstance, sub: string, scopes: string[]) =>
      (
        app as unknown as {
          jwt: { sign: (p: object, o: object) => string };
        }
      ).jwt.sign({ sub, scopes }, { expiresIn: "1h" });

    /** POST as `sub` with `scopes`. */
    const post = (
      app: FastifyInstance,
      url: string,
      payload: object,
      sub: string,
      scopes: string[],
    ) =>
      app.inject({
        method: "POST",
        url,
        payload,
        headers: { authorization: `Bearer ${token(app, sub, scopes)}` },
      });

    it("needs crypto:keys:export, which crypto:admin does not imply", async () => {
      await withEnv(JWT_ONLY, async () => {
        const app = await init();
        try {
          const gen = await post(
            app,
            "/v2/keys/generate",
            { algorithm: "ed25519" },
            "alice",
            ["crypto:keys"],
          );
          const { keyId, publicKey } = gen.json().data;

          for (const scopes of [["crypto:keys"], ["crypto:admin"]]) {
            const denied = await post(
              app,
              "/v2/keys/export",
              { keyId },
              "alice",
              scopes,
            );
            expect(denied.statusCode, scopes.join()).to.equal(403);
          }

          const ok = await post(app, "/v2/keys/export", { keyId }, "alice", [
            "crypto:keys:export",
          ]);
          expect(ok.statusCode).to.equal(200);
          const exported = ok.json().data;
          expect(exported.keyId).to.equal(keyId);
          expect(exported.publicKey).to.equal(publicKey);
          // The exported key is the one the server holds.
          const sig = ed25519Sign(exported.privateKey, "m").signature;
          expect(ed25519Verify(publicKey, "m", sig).valid).to.equal(true);

          // Another principal cannot export it, or use it.
          const other = await post(
            app,
            "/v2/keys/export",
            { keyId },
            "mallory",
            ["crypto:keys:export"],
          );
          expect(other.statusCode).to.equal(404);
          const sign = await post(
            app,
            "/v2/sign",
            { keyId, message: "m" },
            "mallory",
            ["crypto:sign"],
          );
          expect(sign.statusCode).to.equal(404);
        } finally {
          await app.close();
        }
      });
    });

    it("hasScope: crypto:admin does not imply crypto:keys:export", () => {
      const admin = { sub: "a", scopes: ["crypto:admin" as const] };
      expect(hasScope(admin, "crypto:keys")).to.equal(true);
      expect(hasScope(admin, "crypto:keys:export")).to.equal(false);
      expect(
        hasScope(
          { sub: "a", scopes: ["crypto:keys:export"] },
          "crypto:keys:export",
        ),
      ).to.equal(true);
    });
  });

  describe("KeyStore", () => {
    let dir: string;
    beforeEach(() => {
      dir = mkdtempSync(path.join(tmpdir(), "keystore-"));
    });
    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it("keeps keys per owner and checks the algorithm", async () => {
      const store = new KeyStore(undefined);
      const key = await store.put(KEY);
      expect(key.keyId).to.match(/^k_[A-Za-z0-9_-]{22}$/);
      expect((await store.get(key.keyId, "alice")).privateParts).to.deep.equal({
        privateKey: "bb",
      });
      const errors = await Promise.all([
        store.get(key.keyId, "bob").catch((e: KeyStoreError) => e.statusCode),
        store
          .get(key.keyId, "alice", ["x25519"])
          .catch((e: KeyStoreError) => e.code),
        store.get("../etc/passwd", "alice").catch((e) => e.statusCode),
        store.get(`k_${"Q".repeat(22)}`, "alice").catch((e) => e.statusCode),
      ]);
      expect(errors).to.deep.equal([404, "KEY_ALGORITHM_MISMATCH", 404, 404]);
    });

    it("refuses new keys at capacity when nothing persists them", async () => {
      const store = new KeyStore(undefined, 1);
      await store.put(KEY);
      const err = await store.put(KEY).catch((e: KeyStoreError) => e);
      expect((err as KeyStoreError).statusCode).to.equal(503);
    });

    it("persists keys owner-only and reads them back after a restart", async () => {
      const first = new KeyStore(dir, 1);
      const a = await first.put(KEY);
      const b = await first.put(KEY); // evicts a from memory
      const file = path.join(dir, `${a.keyId}.json`);
      // Windows has no POSIX permission bits (files report 0o666), so the
      // owner-only mode can only be checked elsewhere.
      if (process.platform !== "win32") {
        expect(statSync(file).mode & 0o777).to.equal(0o600);
      }
      expect((await first.get(a.keyId, "alice")).keyId).to.equal(a.keyId);

      const restarted = new KeyStore(dir);
      expect(
        (await restarted.get(b.keyId, "alice")).privateParts,
      ).to.deep.equal({ privateKey: "bb" });
    });

    it("ignores a file whose content names another key", async () => {
      const store = new KeyStore(dir);
      const a = await store.put(KEY);
      const forged = `k_${"F".repeat(22)}`;
      writeFileSync(
        path.join(dir, `${forged}.json`),
        readFileSync(path.join(dir, `${a.keyId}.json`)),
      );
      const status = await new KeyStore(dir)
        .get(forged, "alice")
        .catch((e: KeyStoreError) => e.statusCode);
      expect(status).to.equal(404);
      const missing = await new KeyStore(dir)
        .get(`k_${"M".repeat(22)}`, "alice")
        .catch((e: KeyStoreError) => e.statusCode);
      expect(missing).to.equal(404);
    });

    it("keyStoreFromEnv persists to CRYPTO_KEY_OUT_DIR when set", async () => {
      await withEnv({ CRYPTO_KEY_OUT_DIR: dir }, async () => {
        const key = await keyStoreFromEnv().put(KEY);
        expect(statSync(path.join(dir, `${key.keyId}.json`)).isFile()).to.equal(
          true,
        );
      });
      await withEnv({ CRYPTO_KEY_OUT_DIR: undefined }, async () => {
        const key = await keyStoreFromEnv().put(KEY);
        expect(() => statSync(path.join(dir, `${key.keyId}.json`))).to.throw();
      });
    });

    describe("at-rest envelope encryption", () => {
      const storageKeyHex =
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

      it("encrypts private key material on disk with AES-256-GCM", async () => {
        const store = new KeyStore(dir, 10, storageKeyHex);
        const stored = await store.put(KEY);
        const fileContent = JSON.parse(
          readFileSync(path.join(dir, `${stored.keyId}.json`), "utf8"),
        ) as Record<string, unknown>;

        expect(fileContent["privateParts"]).to.be.undefined;
        expect(fileContent["encryptedPrivateParts"]).to.be.an("object");
        const enc = fileContent["encryptedPrivateParts"] as Record<
          string,
          unknown
        >;
        expect(enc["alg"]).to.equal("aes-256-gcm");
        expect(enc["ciphertext"]).to.be.a("string");
        expect(enc["iv"]).to.be.a("string");
        expect(enc["tag"]).to.be.a("string");

        // Can read back after eviction or restart
        const restarted = new KeyStore(dir, 10, storageKeyHex);
        const retrieved = await restarted.get(stored.keyId, "alice");
        expect(retrieved.privateParts).to.deep.equal({ privateKey: "bb" });
      });

      it("supports Buffer and passphrase strings as storage keys", async () => {
        const bufKey = Buffer.alloc(32, 0x42);
        const bufStore = new KeyStore(dir, 10, bufKey);
        const k1 = await bufStore.put(KEY);
        const restartedBuf = new KeyStore(dir, 10, bufKey);
        expect(
          (await restartedBuf.get(k1.keyId, "alice")).privateParts,
        ).to.deep.equal({
          privateKey: "bb",
        });

        const passphraseStore = new KeyStore(dir, 10, "my-secret-passphrase");
        const k2 = await passphraseStore.put(KEY);
        const restartedPass = new KeyStore(dir, 10, "my-secret-passphrase");
        expect(
          (await restartedPass.get(k2.keyId, "alice")).privateParts,
        ).to.deep.equal({
          privateKey: "bb",
        });
      });

      it("fails with STORAGE_KEY_REQUIRED if reading encrypted key without storageKey", async () => {
        const encryptedStore = new KeyStore(dir, 10, storageKeyHex);
        const stored = await encryptedStore.put(KEY);

        const unkeyedStore = new KeyStore(dir, 10, undefined);
        let err: KeyStoreError | undefined;
        try {
          await unkeyedStore.get(stored.keyId, "alice");
        } catch (e) {
          err = e as KeyStoreError;
        }
        expect(err).to.be.instanceOf(KeyStoreError);
        expect(err?.code).to.equal("STORAGE_KEY_REQUIRED");
        expect(err?.statusCode).to.equal(500);
      });

      it("detects tampered ciphertext or auth tag (KEY_INTEGRITY_FAILED)", async () => {
        const store = new KeyStore(dir, 10, storageKeyHex);
        const stored = await store.put(KEY);
        const filePath = path.join(dir, `${stored.keyId}.json`);
        const fileContent = JSON.parse(readFileSync(filePath, "utf8")) as {
          encryptedPrivateParts: { ciphertext: string };
        };

        // Tamper with ciphertext
        const rawCt = Buffer.from(
          fileContent.encryptedPrivateParts.ciphertext,
          "base64",
        );
        rawCt[0] ^= 0xff;
        fileContent.encryptedPrivateParts.ciphertext = rawCt.toString("base64");
        writeFileSync(filePath, JSON.stringify(fileContent));

        const testStore = new KeyStore(dir, 10, storageKeyHex);
        let err: KeyStoreError | undefined;
        try {
          await testStore.get(stored.keyId, "alice");
        } catch (e) {
          err = e as KeyStoreError;
        }
        expect(err).to.be.instanceOf(KeyStoreError);
        expect(err?.code).to.equal("KEY_INTEGRITY_FAILED");
        expect(err?.statusCode).to.equal(500);
      });

      it("detects ciphertext spliced into another key (AAD mismatch)", async () => {
        const store = new KeyStore(dir, 10, storageKeyHex);
        const key1 = await store.put(KEY);
        const key2 = await store.put({ ...KEY, owner: "bob" });

        const path1 = path.join(dir, `${key1.keyId}.json`);
        const path2 = path.join(dir, `${key2.keyId}.json`);

        const content1 = JSON.parse(readFileSync(path1, "utf8")) as Record<
          string,
          unknown
        >;
        const content2 = JSON.parse(readFileSync(path2, "utf8")) as Record<
          string,
          unknown
        >;

        // Splice key1's encrypted ciphertext into key2's record
        content2["encryptedPrivateParts"] = content1["encryptedPrivateParts"];
        writeFileSync(path2, JSON.stringify(content2));

        const testStore = new KeyStore(dir, 10, storageKeyHex);
        let err: KeyStoreError | undefined;
        try {
          await testStore.get(key2.keyId, "bob");
        } catch (e) {
          err = e as KeyStoreError;
        }
        expect(err?.code).to.equal("KEY_INTEGRITY_FAILED");
      });

      it("reads legacy unencrypted keys transparently (backwards compatibility)", async () => {
        const unencryptedStore = new KeyStore(dir, 10, undefined);
        const stored = await unencryptedStore.put(KEY);

        // Store with storageKey configured should still read legacy unencrypted file
        const keyedStore = new KeyStore(dir, 10, storageKeyHex);
        const retrieved = await keyedStore.get(stored.keyId, "alice");
        expect(retrieved.privateParts).to.deep.equal({ privateKey: "bb" });
      });

      it("fails if key file is corrupted and has no private material", async () => {
        const filePath = path.join(dir, `k_${"0".repeat(22)}.json`);
        writeFileSync(
          filePath,
          JSON.stringify({
            keyId: `k_${"0".repeat(22)}`,
            algorithm: "ed25519",
            owner: "alice",
            createdAt: new Date().toISOString(),
            publicParts: { publicKey: "aa" },
          }),
        );

        const store = new KeyStore(dir, 10, storageKeyHex);
        let err: KeyStoreError | undefined;
        try {
          await store.get(`k_${"0".repeat(22)}`, "alice");
        } catch (e) {
          err = e as KeyStoreError;
        }
        expect(err?.code).to.equal("KEY_CORRUPTED");
      });

      it("fails if encrypted algorithm is unsupported", async () => {
        const store = new KeyStore(dir, 10, storageKeyHex);
        const stored = await store.put(KEY);
        const filePath = path.join(dir, `${stored.keyId}.json`);
        const content = JSON.parse(readFileSync(filePath, "utf8")) as {
          encryptedPrivateParts: { alg: string };
        };
        content.encryptedPrivateParts.alg = "unknown-cipher";
        writeFileSync(filePath, JSON.stringify(content));

        const testStore = new KeyStore(dir, 10, storageKeyHex);
        let err: KeyStoreError | undefined;
        try {
          await testStore.get(stored.keyId, "alice");
        } catch (e) {
          err = e as KeyStoreError;
        }
        expect(err?.code).to.equal("UNSUPPORTED_STORAGE_ALGORITHM");
      });

      it("keyStoreFromEnv reads CRYPTO_KEY_STORAGE_KEY", async () => {
        await withEnv(
          { CRYPTO_KEY_OUT_DIR: dir, CRYPTO_KEY_STORAGE_KEY: storageKeyHex },
          async () => {
            const store = keyStoreFromEnv();
            const key = await store.put(KEY);
            const raw = JSON.parse(
              readFileSync(path.join(dir, `${key.keyId}.json`), "utf8"),
            ) as Record<string, unknown>;
            expect(raw["encryptedPrivateParts"]).to.be.an("object");
          },
        );
      });

      it("handles non-32 byte Uint8Array and whitespace-only string storage keys", async () => {
        const shortArray = new Uint8Array([1, 2, 3, 4]);
        const shortStore = new KeyStore(dir, 10, shortArray);
        const k1 = await shortStore.put(KEY);
        const restartedShort = new KeyStore(dir, 10, shortArray);
        expect(
          (await restartedShort.get(k1.keyId, "alice")).privateParts,
        ).to.deep.equal({
          privateKey: "bb",
        });

        const emptyStore = new KeyStore(dir, 10, "   ");
        const k2 = await emptyStore.put(KEY);
        const raw = JSON.parse(
          readFileSync(path.join(dir, `${k2.keyId}.json`), "utf8"),
        ) as Record<string, unknown>;
        expect(raw["privateParts"]).to.deep.equal({ privateKey: "bb" });
      });

      it("returns 404 when key file on disk contains malformed JSON", async () => {
        const keyId = `k_${"A".repeat(22)}`;
        writeFileSync(path.join(dir, `${keyId}.json`), "{invalid json");
        const store = new KeyStore(dir, 10, storageKeyHex);
        let status: number | undefined;
        try {
          await store.get(keyId, "alice");
        } catch (e) {
          status = (e as KeyStoreError).statusCode;
        }
        expect(status).to.equal(404);
      });
    });
  });
});
