/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file POST `/v1/revoke` — revoke the shipped key pair.
 */

import type { FastifyInstance } from "fastify";
import revoke from "@sebastienrousseau/crypto-lib/dist/lib/revoke";
import { IBodyRevoke, REVOCATION_FLAGS, RevocationFlag } from "../../@types/types";
import {
  validateRequiredString,
  validateRequiredNumber,
  sendValidationError,
  validateApiKey,
  ValidationError,
} from "../../utils/validation";

const revokeSchema = {
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

export default (app: FastifyInstance): void => {
  app.post<{ Body: IBodyRevoke }>(
    "/v1/revoke",
    { schema: revokeSchema },
    async (request, reply) => {
      try {
        const apiKeyConfig = process.env["CRYPTO_API_KEY"];
        if (!validateApiKey(request.headers["x-api-key"], apiKeyConfig)) {
          return reply.status(401).send({ error: "Unauthorized: Invalid or missing API key" });
        }

        const body = request.body as IBodyRevoke;
        const errors: ValidationError[] = [];

        const passphraseResult = validateRequiredString(body.passphrase, "passphrase");
        if (!passphraseResult.valid) errors.push(passphraseResult.error);

        const flagResult = validateRequiredNumber(body.flag, "flag", { min: 0, max: 3 });
        if (!flagResult.valid) {
          errors.push(flagResult.error);
        } else if (!REVOCATION_FLAGS.includes(flagResult.value as RevocationFlag)) {
          errors.push({
            field: "flag",
            message: `flag must be one of: ${REVOCATION_FLAGS.join(", ")}`,
          });
        }

        const reasonResult = validateRequiredString(body.reason, "reason");
        if (!reasonResult.valid) errors.push(reasonResult.error);

        if (errors.length > 0) {
          return sendValidationError(reply, errors);
        }

        const revocationData = await revoke({
          passphrase: (passphraseResult as { valid: true; value: string }).value,
          flag: (flagResult as { valid: true; value: number }).value,
          reason: (reasonResult as { valid: true; value: string }).value,
        });

        return reply.send({ data: revocationData });
      } catch (error) {
        request.log.error(error, "Revocation operation failed");
        return reply.status(500).send({ error: "Revocation failed" });
      }
    },
  );
};
