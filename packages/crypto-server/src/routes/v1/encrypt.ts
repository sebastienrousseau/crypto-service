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
import { validateRequiredString, validateBase64 } from "../../utils/validation";
import {
  rejectUnauthorized,
  collectValidation,
} from "../../utils/route-helpers";

const encryptSchema = {
  tags: ["Encryption"],
  summary: "Encrypt a message",
  description:
    "Encrypts a plaintext message using the supplied PGP public key and passphrase.",
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
        if (rejectUnauthorized(request, reply)) return;

        const body = request.body as IBodyEncrypt;
        const v = collectValidation(
          {
            passphrase: validateRequiredString(body.passphrase, "passphrase"),
            message: validateRequiredString(body.message, "message"),
            publicKey: validateBase64(body.publicKey, "publicKey"),
          },
          reply,
        );
        if (!v) return;

        const encryptedData = await encrypt({
          passphrase: v.passphrase,
          message: v.message,
          publicKey: v.publicKey,
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
