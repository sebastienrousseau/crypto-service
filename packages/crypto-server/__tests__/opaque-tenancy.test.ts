/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * OPAQUE abuse resistance. All four OPAQUE routes were public, so anyone
 * could register any credential identifier first (claiming another
 * user's name), every unauthenticated caller shared one 60-request
 * metering bucket (one client could block all logins), and the record
 * and session stores had no bound.
 */
import { expect } from "chai";
import type { FastifyInstance } from "fastify";
import { protocols } from "@sebastienrousseau/crypto-lib";
import { init } from "../src/server";
import { OpaqueStore, OpaqueStoreFullError } from "../src/lib/opaque-store";
import {
  PUBLIC,
  isPublicRoute,
  routeRequirement,
} from "../src/config/auth-policy";
import { JWT_ENV, bearer, withEnv } from "./support/auth";

const { pake } = protocols;

/** Register `id` with `password` through the API as `headers`. */
async function register(
  app: FastifyInstance,
  id: string,
  password: string,
  headers: Record<string, string> = {},
): Promise<number> {
  const { request, blind } = pake.createRegistrationRequest(password);
  const init1 = await app.inject({
    method: "POST",
    url: "/v2/opaque/register/init",
    headers,
    payload: {
      credentialIdentifier: id,
      request: Buffer.from(pake.serializeRegistrationRequest(request)).toString(
        "hex",
      ),
    },
  });
  if (init1.statusCode !== 200) return init1.statusCode;
  const { record } = pake.finalizeRegistrationRequest(
    password,
    blind,
    pake.deserializeRegistrationResponse(
      new Uint8Array(Buffer.from(init1.json().data.response, "hex")),
    ),
  );
  const finish = await app.inject({
    method: "POST",
    url: "/v2/opaque/register/finish",
    headers,
    payload: {
      credentialIdentifier: id,
      record: Buffer.from(pake.serializeRegistrationRecord(record)).toString(
        "hex",
      ),
    },
  });
  return finish.statusCode;
}

/** Start a login for `id`, from `ip`, with no credentials. */
async function loginInit(
  app: FastifyInstance,
  id: string,
  ip = "198.51.100.1",
) {
  const { ke1 } = pake.generateKE1("pw");
  return app.inject({
    method: "POST",
    url: "/v2/opaque/login/init",
    remoteAddress: ip,
    payload: {
      credentialIdentifier: id,
      ke1: Buffer.from(pake.serializeKE1(ke1)).toString("hex"),
    },
  });
}

describe("OPAQUE abuse resistance", function () {
  this.timeout(120000);

  describe("route policy", () => {
    it("keeps login public and puts registration behind authentication", () => {
      expect(routeRequirement("POST", "/v2/opaque/login/init")).to.equal(
        PUBLIC,
      );
      expect(routeRequirement("POST", "/v2/opaque/login/finish")).to.equal(
        PUBLIC,
      );
      expect(routeRequirement("POST", "/v2/opaque/register/init")).to.not.equal(
        PUBLIC,
      );
      expect(isPublicRoute("/v2/opaque/register/init")).to.equal(false);
      expect(isPublicRoute("/v2/opaque/register/finish")).to.equal(false);
    });
  });

  describe("with JWT authentication", () => {
    let app: FastifyInstance;
    before(async () => {
      await withEnv(JWT_ENV, async () => {
        app = await init();
      });
    });
    after(async () => {
      await app.close();
    });
    const asJwt = (fn: () => Promise<void>) => () => withEnv(JWT_ENV, fn);

    it(
      "refuses registration without credentials",
      asJwt(async () => {
        expect(await register(app, "mallory", "pw")).to.equal(401);
      }),
    );

    it(
      "lets a principal register only its own subject",
      asJwt(async () => {
        const bob = bearer("bob", ["crypto:hash"]);
        expect(await register(app, "alice", "pw", bob)).to.equal(403);
        // The finish step checks too, so it cannot be called on its own.
        const finish = await app.inject({
          method: "POST",
          url: "/v2/opaque/register/finish",
          headers: bob,
          payload: { credentialIdentifier: "alice", record: "00" },
        });
        expect(finish.statusCode).to.equal(403);
        expect(await register(app, "bob", "pw", bob)).to.equal(200);
      }),
    );

    it(
      "lets an admin provision any identifier",
      asJwt(async () => {
        const admin = bearer("root", ["crypto:admin"]);
        expect(await register(app, "carol", "pw", admin)).to.equal(200);
      }),
    );

    it(
      "serves login without credentials",
      asJwt(async () => {
        const res = await loginInit(app, "carol");
        expect(res.statusCode).to.equal(200);
        expect(res.json().data).to.have.property("ke2");
      }),
    );

    it(
      "meters unauthenticated callers per client address",
      asJwt(async () => {
        // The bucket refills at 60 a minute, so send until it is empty.
        let status: number | undefined;
        for (let i = 0; i < 200 && status !== 429; i++) {
          status = (await loginInit(app, "carol", "203.0.113.7")).statusCode;
        }
        expect(status).to.equal(429);
        expect(
          (await loginInit(app, "carol", "203.0.113.8")).statusCode,
        ).to.equal(200);
      }),
    );
  });

  describe("bounded stores", () => {
    const record = new OpaqueStore().getFakeRecord();
    const state = {} as never;

    it("refuses records beyond its capacity", () => {
      const store = new OpaqueStore({ maxRecords: 2 });
      store.setRecord("a", record);
      store.setRecord("b", record);
      expect(() => store.setRecord("c", record)).to.throw(OpaqueStoreFullError);
      store.setRecord("a", record);
    });

    it("refuses sessions beyond its capacity, after dropping expired ones", () => {
      const store = new OpaqueStore({ maxSessions: 2 });
      store.createSession("a", state, "P256-SHA256", -1);
      store.createSession("b", state, "P256-SHA256", -1);
      store.createSession("c", state);
      store.createSession("d", state);
      expect(() => store.createSession("e", state)).to.throw(
        OpaqueStoreFullError,
      );
    });

    it("answers 503 when the record store is full", async () => {
      const app = await init();
      try {
        app.opaqueStore = new OpaqueStore({ maxRecords: 0 });
        expect(await register(app, "dave", "pw")).to.equal(503);
      } finally {
        await app.close();
      }
    });
  });
});
