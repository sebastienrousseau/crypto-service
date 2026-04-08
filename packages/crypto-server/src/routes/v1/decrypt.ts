/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file POST `/v1/decrypt` — decrypt a PGP message.
 */

import type { FastifyInstance } from "fastify";
import decrypt from "@sebastienrousseau/crypto-lib/dist/lib/decrypt";
import { IBodyDecrypt } from "../../@types/types";
import {
  validateRequiredString,
  validateBase64,
  sendValidationError,
  validateApiKey,
  ValidationError,
} from "../../utils/validation";

const decryptSchema = {
  body: {
    type: "object",
    required: ["passphrase", "message", "publicKey", "privateKey"],
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
  app.post<{ Body: IBodyDecrypt }>(
    "/v1/decrypt",
    { schema: decryptSchema },
    async (request, reply) => {
      try {
        const apiKeyConfig = process.env["CRYPTO_API_KEY"];
        if (!validateApiKey(request.headers["x-api-key"], apiKeyConfig)) {
          return reply.status(401).send({ error: "Unauthorized: Invalid or missing API key" });
        }

        const body = request.body as IBodyDecrypt;
        const errors: ValidationError[] = [];

        const passphraseResult = validateRequiredString(body.passphrase, "passphrase");
        if (!passphraseResult.valid) errors.push(passphraseResult.error);

        const messageResult = validateBase64(body.message, "message");
        if (!messageResult.valid) errors.push(messageResult.error);

        const publicKeyResult = validateBase64(body.publicKey, "publicKey");
        if (!publicKeyResult.valid) errors.push(publicKeyResult.error);

        const privateKeyResult = validateBase64(body.privateKey, "privateKey");
        if (!privateKeyResult.valid) errors.push(privateKeyResult.error);

        if (errors.length > 0) {
          return sendValidationError(reply, errors);
        }

        const decryptedData = await decrypt({
          passphrase: (passphraseResult as { valid: true; value: string }).value,
          message: (messageResult as { valid: true; value: string }).value,
          publicKey: (publicKeyResult as { valid: true; value: string }).value,
          privateKey: (privateKeyResult as { valid: true; value: string }).value,
        });

        return reply.send({ data: decryptedData });
      } catch (error) {
        request.log.error(error, "Decryption operation failed");
        return reply.status(500).send({ error: "Decryption failed" });
      }
    },
  );
};
