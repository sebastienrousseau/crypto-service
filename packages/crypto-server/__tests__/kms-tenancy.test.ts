/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * KMS tenancy. The KMS routes used to let any caller pick any provider
 * (acting with the server's own cloud identity, or with placeholder
 * credentials) and use any keyId, including another principal's.
 * Providers are now an operator allowlist checked at startup, and a key
 * created through the API belongs to its creator.
 */
import { expect } from "chai";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";
import { KmsOwners } from "../src/lib/kms-owners";
import { KmsRegistry, kmsConfigError } from "../src/lib/kms-providers";
import { JWT_ENV, bearer, withEnv } from "./support/auth";

const USER = ["crypto:keys", "crypto:encrypt", "crypto:decrypt"];

async function rejection(p: Promise<unknown>): Promise<Error> {
  try {
    await p;
  } catch (err) {
    return err as Error;
  }
  throw new Error("expected a rejection");
}

describe("KMS tenancy", function () {
  this.timeout(60000);

  describe("provider allowlist", () => {
    it("enables only the local provider by default", () => {
      expect(kmsConfigError({})).to.equal(null);
    });

    it("refuses unknown providers, the Azure stub and missing settings", () => {
      expect(kmsConfigError({ KMS_PROVIDERS: "local,nope" })).to.match(/nope/);
      expect(kmsConfigError({ KMS_PROVIDERS: "azure" })).to.match(/stub/);
      expect(kmsConfigError({ KMS_PROVIDERS: "gcp" })).to.match(
        /GCP_PROJECT_ID.*GCP_LOCATION_ID.*GCP_KEY_RING_ID.*GCP_AUTH_TOKEN/,
      );
      expect(
        kmsConfigError({ KMS_PROVIDERS: "vault", VAULT_ADDR: "http://v" }),
      ).to.match(/VAULT_TOKEN/);
      expect(kmsConfigError({ KMS_PROVIDERS: "aws" })).to.match(/AWS_REGION/);
      expect(
        kmsConfigError({
          KMS_PROVIDERS: " Vault , local ",
          VAULT_ADDR: "http://v",
          VAULT_TOKEN: "t",
        }),
      ).to.equal(null);
    });

    it("does not start with an invalid provider configuration", async () => {
      await withEnv({ KMS_PROVIDERS: "gcp" }, async () => {
        const err = await rejection(init());
        expect(err.message).to.match(/GCP_PROJECT_ID/);
      });
    });

    it("answers 400 for a provider that is not enabled, without contacting it", async () => {
      const app = await init();
      try {
        for (const provider of ["aws", "gcp", "vault", "azure", "nope"]) {
          const res = await app.inject({
            method: "POST",
            url: "/v2/kms/create-key",
            payload: { provider },
          });
          expect(res.statusCode, provider).to.equal(400);
          expect(res.json().type).to.match(/kms-provider-not-enabled$/);
        }
      } finally {
        await app.close();
      }
    });

    it("builds an enabled provider from its settings", async () => {
      await withEnv(
        {
          KMS_PROVIDERS: "local,vault",
          VAULT_ADDR: "http://127.0.0.1:1",
          VAULT_TOKEN: "t",
        },
        async () => {
          const app = await init();
          try {
            expect(app.kms.get("vault").name).to.equal("vault");
            expect(app.kms.get("LOCAL").name).to.equal("local");
          } finally {
            await app.close();
          }
        },
      );
    });
  });

  describe("provider construction", () => {
    it("builds AWS and Google Cloud providers from their settings", () => {
      const registry = new KmsRegistry({
        KMS_PROVIDERS: "aws,gcp",
        AWS_REGION: "eu-west-1",
        GCP_PROJECT_ID: "p",
        GCP_LOCATION_ID: "l",
        GCP_KEY_RING_ID: "r",
        GCP_AUTH_TOKEN: "t",
      });
      expect(registry.get("aws").name).to.equal("aws");
      expect(registry.get("gcp").name).to.equal("gcp");
      expect(() => registry.get()).to.throw(/not enabled/);
    });
  });

  describe("key ownership", () => {
    let app: FastifyInstance;
    const post = (url: string, payload: object, headers: object) =>
      app.inject({
        method: "POST",
        url,
        payload,
        headers: headers as Record<string, string>,
      });

    before(async () => {
      await withEnv(JWT_ENV, async () => {
        app = await init();
      });
    });
    after(async () => {
      await app.close();
    });

    // JWT_ENV stays applied for requests made inside each test.
    const asUser = (fn: () => Promise<void>) => () => withEnv(JWT_ENV, fn);

    it(
      "lets the creator use a key and hides it from everyone else",
      asUser(async () => {
        const alice = bearer("alice", USER);
        const bob = bearer("bob", USER);
        const admin = bearer("root", ["crypto:admin"]);
        const created = await post("/v2/kms/create-key", {}, alice);
        expect(created.statusCode).to.equal(200);
        const keyId = created.json().data.keyId;

        const enc = await post(
          "/v2/kms/encrypt",
          { keyId, plaintext: "hi" },
          alice,
        );
        expect(enc.statusCode).to.equal(200);
        const { ciphertext } = enc.json().data;

        for (const who of [bob, admin]) {
          const attempts = [
            post("/v2/kms/encrypt", { keyId, plaintext: "hi" }, who),
            post("/v2/kms/decrypt", { keyId, ciphertext }, who),
            post("/v2/kms/wrap", { keyId, unwrappedKey: "00".repeat(32) }, who),
            post("/v2/kms/unwrap", { keyId, wrappedKey: ciphertext }, who),
            post("/v2/kms/generate-data-key", { keyId }, who),
          ];
          for (const res of await Promise.all(attempts)) {
            expect(res.statusCode).to.equal(404);
            expect(res.json().type).to.match(/kms-key-not-found$/);
          }
        }

        const dec = await post("/v2/kms/decrypt", { keyId, ciphertext }, alice);
        expect(dec.statusCode).to.equal(200);
        expect(dec.json().data.plaintext).to.equal("hi");
      }),
    );

    it(
      "lets only an admin use a key nobody created through the API",
      asUser(async () => {
        const meta = await app.kms
          .get("local")
          .createKey("aes-256-gcm", "encrypt");
        const keyId = meta.keyId;
        const user = await post(
          "/v2/kms/encrypt",
          { keyId, plaintext: "x" },
          bearer("alice", USER),
        );
        expect(user.statusCode).to.equal(404);
        const admin = await post(
          "/v2/kms/encrypt",
          { keyId, plaintext: "x" },
          bearer("root", ["crypto:admin"]),
        );
        expect(admin.statusCode).to.equal(200);
      }),
    );

    it(
      "answers 500 for an unexpected provider failure",
      asUser(async () => {
        const failing = { ...app.kms.get("local") } as never as Record<
          string,
          unknown
        >;
        app.kms.register("broken", {
          ...(failing as object),
          name: "broken",
          encrypt: async () => {
            throw new Error("backend exploded");
          },
        } as never);
        const res = await post(
          "/v2/kms/encrypt",
          { provider: "broken", keyId: "k1", plaintext: "x" },
          bearer("root", ["crypto:admin"]),
        );
        expect(res.statusCode).to.equal(500);
        expect(res.json().detail).to.not.include("exploded");
      }),
    );

    it(
      "maps provider errors to client errors, not 500",
      asUser(async () => {
        const alice = bearer("alice", USER);
        const keyId = (await post("/v2/kms/create-key", {}, alice)).json().data
          .keyId;
        const enc = await post(
          "/v2/kms/encrypt",
          { keyId, plaintext: "hi", context: { tenant: "a" } },
          alice,
        );
        const wrongContext = await post(
          "/v2/kms/decrypt",
          {
            keyId,
            ciphertext: enc.json().data.ciphertext,
            context: { tenant: "b" },
          },
          alice,
        );
        expect(wrongContext.statusCode).to.equal(400);
        expect(wrongContext.json().code).to.equal("DECRYPTION_FAILED");

        const missing = await post(
          "/v2/kms/encrypt",
          { keyId: "does-not-exist", plaintext: "x" },
          bearer("root", ["crypto:admin"]),
        );
        expect(missing.statusCode).to.equal(404);
        expect(missing.json().code).to.equal("NOT_FOUND");

        const badAlgorithm = await post(
          "/v2/kms/create-key",
          { algorithm: "rsa-2048", usage: "sign" },
          alice,
        );
        expect(badAlgorithm.statusCode).to.equal(400);
        expect(badAlgorithm.json().code).to.equal("INVALID_ARGUMENT");
      }),
    );
  });

  describe("ownership persistence", () => {
    it("persists owners to kms-owners.json (mode 0600) and reloads them", () => {
      const dir = mkdtempSync(path.join(tmpdir(), "kms-owners-"));
      try {
        const owners = new KmsOwners(dir);
        owners.bind("local", "k1", "alice");
        const file = path.join(dir, "kms-owners.json");
        expect(statSync(file).mode & 0o777).to.equal(0o600);
        expect(JSON.parse(readFileSync(file, "utf8"))).to.deep.equal({
          version: 1,
          owners: { "local:k1": "alice" },
        });
        const reloaded = new KmsOwners(dir);
        expect(reloaded.ownerOf("local", "k1")).to.equal("alice");
        expect(reloaded.ownerOf("local", "k2")).to.equal(undefined);
        expect(reloaded.ownerOf("vault", "k1")).to.equal(undefined);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it("keeps owners in memory without a directory", () => {
      const owners = new KmsOwners(undefined);
      owners.bind("local", "k1", "alice");
      expect(owners.ownerOf("local", "k1")).to.equal("alice");
    });

    it("refuses to rebind a key to another principal", () => {
      const owners = new KmsOwners(undefined);
      owners.bind("local", "k1", "alice");
      expect(() => owners.bind("local", "k1", "bob")).to.throw(/already owned/);
      owners.bind("local", "k1", "alice");
    });

    it("refuses an ownership file in an unexpected format", () => {
      const dir = mkdtempSync(path.join(tmpdir(), "kms-owners-"));
      try {
        writeFileSync(
          path.join(dir, "kms-owners.json"),
          JSON.stringify({ version: 2, owners: {} }),
        );
        expect(() => new KmsOwners(dir)).to.throw(/unexpected format/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it("refuses a corrupt ownership file instead of starting with no owners", () => {
      const dir = mkdtempSync(path.join(tmpdir(), "kms-owners-"));
      try {
        writeFileSync(path.join(dir, "kms-owners.json"), "{not json");
        expect(() => new KmsOwners(dir)).to.throw(/kms-owners.json/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});
