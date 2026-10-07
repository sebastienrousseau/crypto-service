/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { CryptoError, protocols } from "@sebastienrousseau/crypto-lib";
import { sendProblem } from "../../lib/problem";
import { classifyCryptoError } from "../../utils/route-helpers";

type SuiteId = protocols.pake.SuiteId;

const { pake } = protocols;

/** Convert a valid hex string to a Uint8Array. */
function parseHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new CryptoError("Invalid hex string", "INVALID_HEX");
  }
  return new Uint8Array(Buffer.from(hex, "hex"));
}

/** Convert a Uint8Array to a lowercase hex string. */
function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/** Rate limit options for OPAQUE authentication routes. */
const OPAQUE_RATE_LIMIT = Object.freeze({
  config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
});

/** Supported suite enum for request schemas. */
const SUPPORTED_SUITES = ["P256-SHA256", "ristretto255-SHA512"] as const;

const REGISTER_INIT_SCHEMA = {
  tags: ["OPAQUE"],
  summary: "Initiate OPAQUE credential registration",
  description:
    "Evaluates the client's blinded registration request using the server's OPRF seed.",
  body: {
    type: "object",
    required: ["credentialIdentifier", "request"],
    additionalProperties: false,
    properties: {
      credentialIdentifier: { type: "string", minLength: 1, maxLength: 256 },
      request: { type: "string", minLength: 2, pattern: "^[0-9a-fA-F]+$" },
      suite: { type: "string", enum: SUPPORTED_SUITES },
    },
  },
} as const;

const REGISTER_FINISH_SCHEMA = {
  tags: ["OPAQUE"],
  summary: "Finish OPAQUE credential registration",
  description:
    "Stores the client's registration record under their credential identifier.",
  body: {
    type: "object",
    required: ["credentialIdentifier", "record"],
    additionalProperties: false,
    properties: {
      credentialIdentifier: { type: "string", minLength: 1, maxLength: 256 },
      record: { type: "string", minLength: 2, pattern: "^[0-9a-fA-F]+$" },
      suite: { type: "string", enum: SUPPORTED_SUITES },
    },
  },
} as const;

const LOGIN_INIT_SCHEMA = {
  tags: ["OPAQUE"],
  summary: "Initiate OPAQUE login handshake",
  description:
    "Evaluates client's KE1 and returns KE2 along with a transient login session identifier.",
  body: {
    type: "object",
    required: ["credentialIdentifier", "ke1"],
    additionalProperties: false,
    properties: {
      credentialIdentifier: { type: "string", minLength: 1, maxLength: 256 },
      ke1: { type: "string", minLength: 2, pattern: "^[0-9a-fA-F]+$" },
      suite: { type: "string", enum: SUPPORTED_SUITES },
    },
  },
} as const;

const LOGIN_FINISH_SCHEMA = {
  tags: ["OPAQUE"],
  summary: "Finish OPAQUE login handshake",
  description:
    "Verifies client's KE3 auth response in constant time and returns the shared session key.",
  body: {
    type: "object",
    required: ["sessionId", "ke3"],
    additionalProperties: false,
    properties: {
      sessionId: { type: "string", minLength: 1, maxLength: 128 },
      ke3: { type: "string", minLength: 2, pattern: "^[0-9a-fA-F]+$" },
    },
  },
} as const;

/** `POST /v2/opaque/register/init`: Evaluate client's blinded registration request. */
function registerRegisterInit(app: FastifyInstance): void {
  app.post(
    "/v2/opaque/register/init",
    { ...OPAQUE_RATE_LIMIT, schema: REGISTER_INIT_SCHEMA },
    async (request, reply) => {
      try {
        const body = request.body as {
          credentialIdentifier: string;
          request: string;
          suite?: SuiteId;
        };
        const suite = body.suite ?? "P256-SHA256";
        const store = request.server.opaqueStore;
        const setup = store.getSetup(suite);
        const reqBytes = parseHex(body.request);
        const regReq = pake.deserializeRegistrationRequest(reqBytes, suite);
        const regRes = pake.createRegistrationResponse(
          regReq,
          setup.serverPublicKey,
          body.credentialIdentifier,
          setup.oprfSeed,
          { suite },
        );
        const responseBytes = pake.serializeRegistrationResponse(regRes);
        return reply.send({ data: { response: toHex(responseBytes) } });
      } catch (error) {
        return classifyCryptoError(
          error,
          request,
          reply,
          "OPAQUE registration init",
        );
      }
    },
  );
}

/** `POST /v2/opaque/register/finish`: Store client's registration record. */
function registerRegisterFinish(app: FastifyInstance): void {
  app.post(
    "/v2/opaque/register/finish",
    { ...OPAQUE_RATE_LIMIT, schema: REGISTER_FINISH_SCHEMA },
    async (request, reply) => {
      try {
        const body = request.body as {
          credentialIdentifier: string;
          record: string;
          suite?: SuiteId;
        };
        const suite = body.suite ?? "P256-SHA256";
        const store = request.server.opaqueStore;
        if (store.hasRecord(body.credentialIdentifier)) {
          return sendProblem(
            reply,
            409,
            "conflict",
            "Credential identifier is already registered",
            { code: "CREDENTIAL_EXISTS" },
          );
        }
        const recBytes = parseHex(body.record);
        const record = pake.deserializeRegistrationRecord(recBytes, suite);
        store.setRecord(body.credentialIdentifier, record);
        return reply.send({
          data: {
            status: "registered",
            credentialIdentifier: body.credentialIdentifier,
          },
        });
      } catch (error) {
        return classifyCryptoError(
          error,
          request,
          reply,
          "OPAQUE registration finish",
        );
      }
    },
  );
}

/** `POST /v2/opaque/login/init`: Respond to client's KE1 with KE2. */
function registerLoginInit(app: FastifyInstance): void {
  app.post(
    "/v2/opaque/login/init",
    { ...OPAQUE_RATE_LIMIT, schema: LOGIN_INIT_SCHEMA },
    async (request, reply) => {
      try {
        const body = request.body as {
          credentialIdentifier: string;
          ke1: string;
          suite?: SuiteId;
        };
        const suite = body.suite ?? "P256-SHA256";
        const store = request.server.opaqueStore;
        const setup = store.getSetup(suite);
        const record =
          store.getRecord(body.credentialIdentifier) ??
          store.getFakeRecord(suite);
        const ke1Bytes = parseHex(body.ke1);
        const ke1 = pake.deserializeKE1(ke1Bytes, suite);
        const { ke2, state } = pake.generateKE2(
          {
            serverPrivateKey: setup.serverPrivateKey,
            serverPublicKey: setup.serverPublicKey,
            oprfSeed: setup.oprfSeed,
            record,
            credentialIdentifier: body.credentialIdentifier,
            ke1,
          },
          { suite },
        );
        const sessionId = store.createSession(
          body.credentialIdentifier,
          state,
          suite,
        );
        const ke2Bytes = pake.serializeKE2(ke2);
        return reply.send({ data: { sessionId, ke2: toHex(ke2Bytes) } });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "OPAQUE login init");
      }
    },
  );
}

/** `POST /v2/opaque/login/finish`: Finalize login handshake with KE3 and return session key. */
function registerLoginFinish(app: FastifyInstance): void {
  app.post(
    "/v2/opaque/login/finish",
    { ...OPAQUE_RATE_LIMIT, schema: LOGIN_FINISH_SCHEMA },
    async (request, reply) => {
      try {
        const body = request.body as { sessionId: string; ke3: string };
        const store = request.server.opaqueStore;
        const session = store.consumeSession(body.sessionId);
        if (!session) {
          return sendProblem(
            reply,
            400,
            "invalid-input",
            "Invalid or expired login session",
            { code: "INVALID_SESSION" },
          );
        }
        const ke3Bytes = parseHex(body.ke3);
        const ke3 = pake.deserializeKE3(ke3Bytes, session.suite);
        const sessionKey = pake.serverFinish(session.serverState, ke3);
        return reply.send({ data: { sessionKey: toHex(sessionKey) } });
      } catch (error) {
        return classifyCryptoError(
          error,
          request,
          reply,
          "OPAQUE login finish",
        );
      }
    },
  );
}

/** Registers all OPAQUE protocol routes. */
export default (app: FastifyInstance): void => {
  registerRegisterInit(app);
  registerRegisterFinish(app);
  registerLoginInit(app);
  registerLoginFinish(app);
};
