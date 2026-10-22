/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks POST `/v1/verify` — verify a signed message.
 *
 * @deprecated The v1 API (OpenPGP-based) is deprecated and will be removed in v1.0.0.
 * Use POST /v2/verify instead.
 */

import type { FastifyInstance } from "fastify";
import { verify } from "@sebastienrousseau/crypto-lib/pgp";
import { IBodyVerify } from "../../@types/types";
import {
  validateBase64,
  validateDateString,
  validateRequiredString,
} from "../../utils/validation";
import { collectValidation } from "../../utils/route-helpers";
import { PROBLEM_SCHEMA, sendProblem } from "../../lib/problem";

/** Fastify JSON Schema for the v1 signature-verification endpoint. */
const verifySchema = {
  tags: ["Signing"],
  deprecated: true,
  summary: "Verify a signed message",
  description:
    "Verifies a clear-signed PGP message, or a message and its base64-encoded detached signature, against the supplied verification keys. `verified` is true only when every signature found verifies; input that carries no signature answers 400.",
  response: {
    200: {
      type: "object",
      additionalProperties: true,
      properties: {
        data: {
          type: "object",
          properties: {
            verified: { type: "boolean" },
            data: { type: "string" },
            keyIDs: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    400: PROBLEM_SCHEMA,
    401: PROBLEM_SCHEMA,
  },
  body: {
    type: "object",
    required: ["date", "message", "verificationKeys"],
    additionalProperties: false,
    properties: {
      date: { type: "string", minLength: 1, maxLength: 64 },
      message: { type: "string", minLength: 1, maxLength: 1024 * 1024 },
      verificationKeys: { type: "string", minLength: 1, maxLength: 64 * 1024 },
      signature: { type: "string", minLength: 1, maxLength: 64 * 1024 },
    },
  },
} as const;

/** @deprecated Registers the v1 PGP verify route. Use v2 endpoints instead. */
export default (app: FastifyInstance): void => {
  app.post<{ Body: IBodyVerify }>(
    "/v1/verify",
    {
      schema: verifySchema,
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const body = request.body as IBodyVerify;
      const v = collectValidation(
        {
          date: validateDateString(body.date, "date"),
          message: validateRequiredString(body.message, "message"),
          verificationKeys: validateBase64(
            body.verificationKeys,
            "verificationKeys",
          ),
          ...(body.signature === undefined
            ? {}
            : { signature: validateBase64(body.signature, "signature") }),
        },
        reply,
      );
      if (!v) return reply;

      try {
        const verifyData = await verify({
          date: v.date as Date,
          message: v.message,
          verificationKeys: v.verificationKeys,
          ...(v.signature === undefined ? {} : { signature: v.signature }),
        });
        return reply.send({ data: verifyData });
      } catch (error) {
        // Everything verify throws comes from reading the request: a
        // message that is not clear-signed, or a key or signature that
        // is not valid armored OpenPGP.
        request.log.warn(error, "Verification input rejected");
        return sendProblem(
          reply,
          400,
          "invalid-input",
          "The message must be clear-signed or come with a detached signature, and the keys must be armored OpenPGP public keys",
        );
      }
    },
  );
};
