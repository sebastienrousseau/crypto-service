/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import type { FastifyInstance } from "fastify";
import { protocols } from "@sebastienrousseau/crypto-lib";
import { init } from "../src/server";
import { OpaqueStore } from "../src/lib/opaque-store";

const { pake } = protocols;

describe("OPAQUE Authentication (RFC 9807)", function () {
  this.timeout(120000);

  describe("OpaqueStore", () => {
    it("manages setups, fake records, registrations and sessions", () => {
      const store = new OpaqueStore();

      // Setups and fake records
      const setupP256 = store.getSetup("P256-SHA256");
      expect(setupP256).to.equal(store.getSetup("P256-SHA256"));
      const setupRistretto = store.getSetup("ristretto255-SHA512");
      expect(setupRistretto).to.not.equal(setupP256);

      const fakeP256 = store.getFakeRecord("P256-SHA256");
      expect(fakeP256).to.equal(store.getFakeRecord("P256-SHA256"));
      const fakeRistretto = store.getFakeRecord("ristretto255-SHA512");
      expect(fakeRistretto).to.not.equal(fakeP256);

      // Records
      expect(store.hasRecord("user1")).to.equal(false);
      expect(store.getRecord("user1")).to.be.undefined;
      store.setRecord("user1", fakeP256);
      expect(store.hasRecord("user1")).to.equal(true);
      expect(store.getRecord("user1")).to.equal(fakeP256);

      // Sessions
      const fakeState =
        {} as unknown as import("@sebastienrousseau/crypto-lib/protocols/pake").ServerLoginState;
      const sessionId = store.createSession(
        "user1",
        fakeState,
        "P256-SHA256",
        10000,
      );
      expect(sessionId).to.be.a("string");

      // Non-existent session
      expect(store.consumeSession("non-existent-id")).to.be.undefined;

      // Expired session
      const expiredId = store.createSession(
        "user1",
        fakeState,
        "P256-SHA256",
        -10,
      );
      expect(store.consumeSession(expiredId)).to.be.undefined;

      // Clean expired sessions
      store.createSession("user1", fakeState, "P256-SHA256", -10);
      store.cleanExpiredSessions();

      // Valid session consumption (single-use)
      const consumed = store.consumeSession(sessionId);
      expect(consumed?.credentialIdentifier).to.equal("user1");
      expect(consumed?.suite).to.equal("P256-SHA256");
      expect(store.consumeSession(sessionId)).to.be.undefined;

      // Clear
      store.clear();
      expect(store.hasRecord("user1")).to.equal(false);
    });
  });

  describe("OPAQUE Routes", () => {
    let app: FastifyInstance;

    before(async () => {
      app = await init();
    });

    after(async () => {
      await app.close();
    });

    it("completes full registration and login handshake for P256-SHA256", async () => {
      const id = "alice@example.com";
      const password = "correct-horse-battery-staple";

      // 1. Registration Init
      const { request, blind } = pake.createRegistrationRequest(password);
      const regInitRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/register/init",
        payload: {
          credentialIdentifier: id,
          request: Buffer.from(
            pake.serializeRegistrationRequest(request),
          ).toString("hex"),
        },
      });
      expect(regInitRes.statusCode).to.equal(200);
      const regInitData = JSON.parse(regInitRes.payload).data;
      expect(regInitData).to.have.property("response");

      // 2. Client finalize registration
      const serverRegRes = pake.deserializeRegistrationResponse(
        new Uint8Array(Buffer.from(regInitData.response, "hex")),
      );
      const { record } = pake.finalizeRegistrationRequest(
        password,
        blind,
        serverRegRes,
      );

      // 3. Registration Finish
      const regFinishRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/register/finish",
        payload: {
          credentialIdentifier: id,
          record: Buffer.from(
            pake.serializeRegistrationRecord(record),
          ).toString("hex"),
        },
      });
      expect(regFinishRes.statusCode).to.equal(200);
      expect(JSON.parse(regFinishRes.payload).data.status).to.equal(
        "registered",
      );

      // 4. Login Init
      const clientLogin = pake.generateKE1(password);
      const loginInitRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/login/init",
        payload: {
          credentialIdentifier: id,
          ke1: Buffer.from(pake.serializeKE1(clientLogin.ke1)).toString("hex"),
        },
      });
      expect(loginInitRes.statusCode).to.equal(200);
      const loginInitData = JSON.parse(loginInitRes.payload).data;
      expect(loginInitData).to.have.property("sessionId");
      expect(loginInitData).to.have.property("ke2");

      // 5. Client generate KE3
      const ke2 = pake.deserializeKE2(
        new Uint8Array(Buffer.from(loginInitData.ke2, "hex")),
      );
      const { ke3, sessionKey: clientSessionKey } = pake.generateKE3(
        clientLogin.state,
        ke2,
      );

      // 6. Login Finish
      const loginFinishRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/login/finish",
        payload: {
          sessionId: loginInitData.sessionId,
          ke3: Buffer.from(pake.serializeKE3(ke3)).toString("hex"),
        },
      });
      expect(loginFinishRes.statusCode).to.equal(200);
      const serverSessionKeyHex = JSON.parse(loginFinishRes.payload).data
        .sessionKey;
      expect(serverSessionKeyHex).to.equal(
        Buffer.from(clientSessionKey).toString("hex"),
      );

      // Second consumption fails with 400
      const secondConsumeRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/login/finish",
        payload: {
          sessionId: loginInitData.sessionId,
          ke3: Buffer.from(pake.serializeKE3(ke3)).toString("hex"),
        },
      });
      expect(secondConsumeRes.statusCode).to.equal(400);
    });

    it("rejects duplicate registration for an already registered credential identifier", async () => {
      const id = "duplicate-user@example.com";
      const password = "initial-password";

      const { request, blind } = pake.createRegistrationRequest(password);
      const regInitRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/register/init",
        payload: {
          credentialIdentifier: id,
          request: Buffer.from(
            pake.serializeRegistrationRequest(request),
          ).toString("hex"),
        },
      });
      expect(regInitRes.statusCode).to.equal(200);

      const serverRegRes = pake.deserializeRegistrationResponse(
        new Uint8Array(
          Buffer.from(JSON.parse(regInitRes.payload).data.response, "hex"),
        ),
      );
      const { record } = pake.finalizeRegistrationRequest(
        password,
        blind,
        serverRegRes,
      );

      const regFinishRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/register/finish",
        payload: {
          credentialIdentifier: id,
          record: Buffer.from(
            pake.serializeRegistrationRecord(record),
          ).toString("hex"),
        },
      });
      expect(regFinishRes.statusCode).to.equal(200);

      // Attempting to re-register the same credentialIdentifier must be rejected with 409 Conflict
      const dupFinishRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/register/finish",
        payload: {
          credentialIdentifier: id,
          record: Buffer.from(
            pake.serializeRegistrationRecord(record),
          ).toString("hex"),
        },
      });
      expect(dupFinishRes.statusCode).to.equal(409);
      const body = JSON.parse(dupFinishRes.payload);
      expect(body.code).to.equal("CREDENTIAL_EXISTS");
      expect(body.status).to.equal(409);
    });

    it("completes full registration and login handshake for ristretto255-SHA512", async () => {
      const suite = "ristretto255-SHA512";
      const id = "bob@example.com";
      const password = "ristretto-secure-password";

      // Registration
      const { request, blind } = pake.createRegistrationRequest(password, {
        suite,
      });
      const regInitRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/register/init",
        payload: {
          credentialIdentifier: id,
          request: Buffer.from(
            pake.serializeRegistrationRequest(request),
          ).toString("hex"),
          suite,
        },
      });
      expect(regInitRes.statusCode).to.equal(200);

      const serverRegRes = pake.deserializeRegistrationResponse(
        new Uint8Array(
          Buffer.from(JSON.parse(regInitRes.payload).data.response, "hex"),
        ),
        suite,
      );
      const { record } = pake.finalizeRegistrationRequest(
        password,
        blind,
        serverRegRes,
        {},
        { suite },
      );

      const regFinishRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/register/finish",
        payload: {
          credentialIdentifier: id,
          record: Buffer.from(
            pake.serializeRegistrationRecord(record),
          ).toString("hex"),
          suite,
        },
      });
      expect(regFinishRes.statusCode).to.equal(200);

      // Login
      const clientLogin = pake.generateKE1(password, { suite });
      const loginInitRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/login/init",
        payload: {
          credentialIdentifier: id,
          ke1: Buffer.from(pake.serializeKE1(clientLogin.ke1)).toString("hex"),
          suite,
        },
      });
      expect(loginInitRes.statusCode).to.equal(200);
      const { sessionId, ke2: ke2Hex } = JSON.parse(loginInitRes.payload).data;

      const ke2 = pake.deserializeKE2(
        new Uint8Array(Buffer.from(ke2Hex, "hex")),
        suite,
      );
      const { ke3, sessionKey: clientKey } = pake.generateKE3(
        clientLogin.state,
        ke2,
        {},
        { suite },
      );

      const loginFinishRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/login/finish",
        payload: {
          sessionId,
          ke3: Buffer.from(pake.serializeKE3(ke3)).toString("hex"),
        },
      });
      expect(loginFinishRes.statusCode).to.equal(200);
      expect(JSON.parse(loginFinishRes.payload).data.sessionKey).to.equal(
        Buffer.from(clientKey).toString("hex"),
      );
    });

    it("uses fake record for unknown user preventing client enumeration", async () => {
      const clientLogin = pake.generateKE1("some-password");
      const loginInitRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/login/init",
        payload: {
          credentialIdentifier: "non-existent-user@example.com",
          ke1: Buffer.from(pake.serializeKE1(clientLogin.ke1)).toString("hex"),
        },
      });
      expect(loginInitRes.statusCode).to.equal(200);
      const { ke2: ke2Hex } = JSON.parse(loginInitRes.payload).data;
      const ke2 = pake.deserializeKE2(
        new Uint8Array(Buffer.from(ke2Hex, "hex")),
      );

      // Client fails envelope recovery because it was generated from fake record
      expect(() => pake.generateKE3(clientLogin.state, ke2)).to.throw();
    });

    it("rejects wrong password on login finish", async () => {
      const id = "charlie@example.com";
      const rightPassword = "right-password";
      const wrongPassword = "wrong-password";

      // Register right password
      const { request, blind } = pake.createRegistrationRequest(rightPassword);
      const regInitRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/register/init",
        payload: {
          credentialIdentifier: id,
          request: Buffer.from(
            pake.serializeRegistrationRequest(request),
          ).toString("hex"),
        },
      });
      const serverRegRes = pake.deserializeRegistrationResponse(
        new Uint8Array(
          Buffer.from(JSON.parse(regInitRes.payload).data.response, "hex"),
        ),
      );
      const { record } = pake.finalizeRegistrationRequest(
        rightPassword,
        blind,
        serverRegRes,
      );
      await app.inject({
        method: "POST",
        url: "/v2/opaque/register/finish",
        payload: {
          credentialIdentifier: id,
          record: Buffer.from(
            pake.serializeRegistrationRecord(record),
          ).toString("hex"),
        },
      });

      // Login with wrong password - client throws envelope recovery error
      const wrongClientLogin = pake.generateKE1(wrongPassword);
      const loginInitRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/login/init",
        payload: {
          credentialIdentifier: id,
          ke1: Buffer.from(pake.serializeKE1(wrongClientLogin.ke1)).toString(
            "hex",
          ),
        },
      });
      const { sessionId, ke2: ke2Hex } = JSON.parse(loginInitRes.payload).data;
      const ke2 = pake.deserializeKE2(
        new Uint8Array(Buffer.from(ke2Hex, "hex")),
      );
      expect(() => pake.generateKE3(wrongClientLogin.state, ke2)).to.throw();

      // If client attempts to send an arbitrary KE3, server rejects with 400
      const bogusKe3 = { clientMac: new Uint8Array(32) };
      const finishRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/login/finish",
        payload: {
          sessionId,
          ke3: Buffer.from(pake.serializeKE3(bogusKe3)).toString("hex"),
        },
      });
      expect(finishRes.statusCode).to.equal(400);
      expect(JSON.parse(finishRes.payload).code).to.equal(
        "OPAQUE_CLIENT_AUTHENTICATION",
      );
    });

    it("handles invalid hex input and schema validation errors", async () => {
      // Invalid hex (odd length) in register init
      const oddHexRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/register/init",
        payload: {
          credentialIdentifier: "user",
          request: "abc",
        },
      });
      expect(oddHexRes.statusCode).to.equal(400);

      // Malformed wire bytes in register init
      const malformedRes = await app.inject({
        method: "POST",
        url: "/v2/opaque/register/init",
        payload: {
          credentialIdentifier: "user",
          request: "1234",
        },
      });
      expect(malformedRes.statusCode).to.equal(400);

      // Malformed register finish
      const malformedFinish = await app.inject({
        method: "POST",
        url: "/v2/opaque/register/finish",
        payload: {
          credentialIdentifier: "user",
          record: "1234",
        },
      });
      expect(malformedFinish.statusCode).to.equal(400);

      // Malformed login init
      const malformedLoginInit = await app.inject({
        method: "POST",
        url: "/v2/opaque/login/init",
        payload: {
          credentialIdentifier: "user",
          ke1: "1234",
        },
      });
      expect(malformedLoginInit.statusCode).to.equal(400);

      // Non-existent session in login finish
      const invalidSession = await app.inject({
        method: "POST",
        url: "/v2/opaque/login/finish",
        payload: {
          sessionId: "unknown-session",
          ke3: "00".repeat(32),
        },
      });
      expect(invalidSession.statusCode).to.equal(400);
      expect(JSON.parse(invalidSession.payload).code).to.equal(
        "INVALID_SESSION",
      );

      // Malformed ke3 length in login finish with valid session
      const store = app.opaqueStore;
      const client = pake.generateKE1("pwd");
      const setup = store.getSetup("P256-SHA256");
      const fakeRec = store.getFakeRecord("P256-SHA256");
      const { state } = pake.generateKE2({
        serverPrivateKey: setup.serverPrivateKey,
        serverPublicKey: setup.serverPublicKey,
        oprfSeed: setup.oprfSeed,
        record: fakeRec,
        credentialIdentifier: "user",
        ke1: client.ke1,
      });
      const validSessionId = store.createSession("user", state, "P256-SHA256");
      const malformedKe3 = await app.inject({
        method: "POST",
        url: "/v2/opaque/login/finish",
        payload: {
          sessionId: validSessionId,
          ke3: "1234",
        },
      });
      expect(malformedKe3.statusCode).to.equal(400);
    });
  });
});
