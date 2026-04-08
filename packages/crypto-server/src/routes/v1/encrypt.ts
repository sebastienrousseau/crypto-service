/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file POST `/v1/encrypt` — encrypt a message with a supplied public key.
 *
 * Accepts a JSON body (not headers) so secrets do not transit through the
 * request line or end up in reverse-proxy access logs.
 */

import type { FastifyInstance } from "fastify";
import encrypt from "@sebastienrousseau/crypto-lib/dist/lib/encrypt";
import { IBodyEncrypt } from "../../@types/types";
import {
  validateRequiredString,
  validateBase64,
  sendValidationError,
  validateApiKey,
  ValidationError,
} from "../../utils/validation";

const encryptSchema = {
  body: {
    type: "object",
    required: ["passphrase", "message", "publicKey"],
    additionalProperties: false,
    properties: {
      passphrase: { type: "string", minLength: 1, maxLength: 1024 },
      message: { type: "string", minLength: 1, maxLength: 1024 * 1024 },
      publicKey: { type: "string", minLength: 1, maxLength: 64 * 1024 },
      privateKey: { type: "string", minLength: 1, maxLength: 64 * 1024 },
    },
  },
} as const;

export default (app: FastifyInstance): void => {
  app.post<{ Body: IBodyEncrypt }>(
    "/v1/encrypt",
    { schema: encryptSchema },
    async (request, reply) => {
      try {
        const apiKeyConfig = process.env["CRYPTO_API_KEY"];
        if (!validateApiKey(request.headers["x-api-key"], apiKeyConfig)) {
          return reply.status(401).send({ error: "Unauthorized: Invalid or missing API key" });
        }

        const body = request.body as IBodyEncrypt;
        const errors: ValidationError[] = [];

        const passphraseResult = validateRequiredString(body.passphrase, "passphrase");
        if (!passphraseResult.valid) errors.push(passphraseResult.error);

        const messageResult = validateRequiredString(body.message, "message");
        if (!messageResult.valid) errors.push(messageResult.error);

        const publicKeyResult = validateBase64(body.publicKey, "publicKey");
        if (!publicKeyResult.valid) errors.push(publicKeyResult.error);

        if (errors.length > 0) {
          return sendValidationError(reply, errors);
        }

        const encryptedData = await encrypt({
          passphrase: (passphraseResult as { valid: true; value: string }).value,
          message: (messageResult as { valid: true; value: string }).value,
          publicKey: (publicKeyResult as { valid: true; value: string }).value,
          ...(body.privateKey ? { privateKey: body.privateKey } : {}),
        });

        return reply.send({ data: encryptedData });
      } catch (error) {
        request.log.error(error, "Encryption operation failed");
        return reply.status(500).send({ error: "Encryption failed" });
      }
    },
  );
};
