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
import verify from "@sebastienrousseau/crypto-lib/dist/lib/verify";
import { IBodyVerify } from "../../@types/types";
import {
  validateBase64,
  validateDateString,
  validateRequiredString,
} from "../../utils/validation";
import {
  rejectUnauthorized,
  collectValidation,
} from "../../utils/route-helpers";

/** Fastify JSON Schema for the v1 signature-verification endpoint. */
const verifySchema = {
  tags: ["Signing"],
  summary: "Verify a signed message",
  description:
    "Verifies a cleartext-signed PGP message against the supplied verification keys.",
  response: {
    200: {
      type: "object",
      additionalProperties: true,
      properties: { data: {} },
    },
    400: {
      type: "object",
      properties: { error: { type: "string" }, details: { type: "array" } },
    },
    401: { type: "object", properties: { error: { type: "string" } } },
  },
  body: {
    type: "object",
    required: ["date", "message", "verificationKeys"],
    additionalProperties: false,
    properties: {
      date: { type: "string", minLength: 1, maxLength: 64 },
      message: { type: "string", minLength: 1, maxLength: 1024 * 1024 },
      verificationKeys: { type: "string", minLength: 1, maxLength: 64 * 1024 },
    },
  },
} as const;

/** @deprecated Registers the v1 PGP verify route. Use v2 endpoints instead. */
export default (app: FastifyInstance): void => {
  app.post<{ Body: IBodyVerify }>(
    "/v1/verify",
    { schema: verifySchema },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;

        const body = request.body as IBodyVerify;
        const v = collectValidation(
          {
            date: validateDateString(body.date, "date"),
            message: validateRequiredString(body.message, "message"),
            verificationKeys: validateBase64(
              body.verificationKeys,
              "verificationKeys",
            ),
          },
          reply,
        );
        if (!v) return;

        const verifyData = await verify({
          date: v.date as Date,
          message: v.message,
          verificationKeys: v.verificationKeys,
        });

        return reply.send({ data: verifyData });
      } catch (error) {
        request.log.error(error, "Verification operation failed");
        return reply.status(500).send({ error: "Verification failed" });
      }
    },
  );
};
