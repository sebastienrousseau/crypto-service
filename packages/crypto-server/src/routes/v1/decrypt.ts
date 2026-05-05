/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file POST `/v1/decrypt` — decrypt a PGP message.
 *
 * @deprecated The v1 API (OpenPGP-based) is deprecated and will be removed in v1.0.0.
 * Use POST /v2/decrypt or POST /v2/secretbox/open instead.
 */

import type { FastifyInstance } from "fastify";
import decrypt from "@sebastienrousseau/crypto-lib/dist/lib/decrypt";
import { IBodyDecrypt } from "../../@types/types";
import { validateRequiredString, validateBase64 } from "../../utils/validation";
import {
  rejectUnauthorized,
  collectValidation,
} from "../../utils/route-helpers";

const decryptSchema = {
  tags: ["Encryption"],
  summary: "Decrypt a message",
  description:
    "Decrypts a PGP-encrypted message using private/public key pair and passphrase.",
  response: {
    200: { type: "object", properties: { data: { type: "string" } } },
    400: {
      type: "object",
      properties: { error: { type: "string" }, details: { type: "array" } },
    },
    401: { type: "object", properties: { error: { type: "string" } } },
  },
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
        if (rejectUnauthorized(request, reply)) return;

        const body = request.body as IBodyDecrypt;
        const v = collectValidation(
          {
            passphrase: validateRequiredString(body.passphrase, "passphrase"),
            message: validateBase64(body.message, "message"),
            publicKey: validateBase64(body.publicKey, "publicKey"),
            privateKey: validateBase64(body.privateKey, "privateKey"),
          },
          reply,
        );
        if (!v) return;

        const decryptedData = await decrypt({
          passphrase: v.passphrase,
          message: v.message,
          publicKey: v.publicKey,
          privateKey: v.privateKey,
        });

        return reply.send({ data: decryptedData });
      } catch (error) {
        request.log.error(error, "Decryption operation failed");
        return reply.status(500).send({ error: "Decryption failed" });
      }
    },
  );
};
