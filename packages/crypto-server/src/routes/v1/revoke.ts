/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks POST `/v1/revoke` — revoke the shipped key pair.
 *
 * @deprecated The v1 API (OpenPGP-based) is deprecated and will be removed in v1.0.0.
 * Use the v2 key management API instead.
 */

import type { FastifyInstance } from "fastify";
import revoke from "@sebastienrousseau/crypto-lib/dist/lib/revoke";
import { IBodyRevoke, REVOCATION_FLAGS } from "../../@types/types";
import {
  validateRequiredString,
  validateRequiredNumber,
} from "../../utils/validation";
import {
  rejectUnauthorized,
  collectValidation,
} from "../../utils/route-helpers";

/** Fastify JSON Schema for the v1 key-revocation endpoint. */
const revokeSchema = {
  tags: ["Key Management"],
  summary: "Revoke a key pair",
  description:
    "Revokes the shipped key pair with a reason code (0=unspecified, 1=superseded, 2=compromised, 3=retired).",
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
    required: ["passphrase", "flag", "reason"],
    additionalProperties: false,
    properties: {
      passphrase: { type: "string", minLength: 1, maxLength: 1024 },
      flag: { type: "number", enum: [...REVOCATION_FLAGS] },
      reason: { type: "string", minLength: 1, maxLength: 2048 },
    },
  },
} as const;

/** @deprecated Registers the v1 PGP key-revocation route. Use v2 endpoints instead. */
export default (app: FastifyInstance): void => {
  app.post<{ Body: IBodyRevoke }>(
    "/v1/revoke",
    { schema: revokeSchema },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;

        const body = request.body as IBodyRevoke;
        const v = collectValidation(
          {
            passphrase: validateRequiredString(body.passphrase, "passphrase"),
            flag: validateRequiredNumber(body.flag, "flag", { min: 0, max: 3 }),
            reason: validateRequiredString(body.reason, "reason"),
          },
          reply,
        );
        /* c8 ignore next -- Fastify schema already validates all fields */
        if (!v) return;

        const revocationData = await revoke({
          passphrase: v.passphrase as string,
          flag: v.flag as number,
          reason: v.reason as string,
        });

        return reply.send({ data: revocationData });
      } catch (error) {
        request.log.error(error, "Revocation operation failed");
        return reply.status(500).send({ error: "Revocation failed" });
      }
    },
  );
};
