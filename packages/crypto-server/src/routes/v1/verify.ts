/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file POST `/v1/verify` — verify a signed message.
 *
 * The rate-limit plugin is registered globally in `server.ts`; the
 * per-route `app.register(fastifyRateLimit, …)` that existed in the
 * previous revision has been removed as it would double-register the
 * plugin on the shared instance.
 */

import type { FastifyInstance } from "fastify";
import verify from "@sebastienrousseau/crypto-lib/dist/lib/verify";
import { IBodyVerify } from "../../@types/types";
import {
  validateBase64,
  validateDateString,
  validateRequiredString,
  sendValidationError,
  validateApiKey,
  ValidationError,
} from "../../utils/validation";

const verifySchema = {
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

export default (app: FastifyInstance): void => {
  app.post<{ Body: IBodyVerify }>(
    "/v1/verify",
    { schema: verifySchema },
    async (request, reply) => {
      try {
        const apiKeyConfig = process.env["CRYPTO_API_KEY"];
        if (!validateApiKey(request.headers["x-api-key"], apiKeyConfig)) {
          return reply.status(401).send({ error: "Unauthorized: Invalid or missing API key" });
        }

        const body = request.body as IBodyVerify;
        const errors: ValidationError[] = [];

        const dateResult = validateDateString(body.date, "date");
        if (!dateResult.valid) errors.push(dateResult.error);

        const messageResult = validateRequiredString(body.message, "message");
        if (!messageResult.valid) errors.push(messageResult.error);

        const verificationKeysResult = validateBase64(body.verificationKeys, "verificationKeys");
        if (!verificationKeysResult.valid) errors.push(verificationKeysResult.error);

        if (errors.length > 0) {
          return sendValidationError(reply, errors);
        }

        const verifyData = await verify({
          date: (dateResult as { valid: true; value: Date }).value,
          message: (messageResult as { valid: true; value: string }).value,
          verificationKeys: (verificationKeysResult as { valid: true; value: string }).value,
        });

        return reply.send({ data: verifyData });
      } catch (error) {
        request.log.error(error, "Verification operation failed");
        return reply.status(500).send({ error: "Verification failed" });
      }
    },
  );
};
