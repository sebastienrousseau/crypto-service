/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as fastify from "fastify";
import { encrypt } from "@sebastienrousseau/crypto-lib";
import type { EncryptBody } from "../../@types/types";

const armoredPrivateKeySchema = {
  type: "object",
  required: ["armored"],
  additionalProperties: false,
  properties: {
    armored: { type: "string", maxLength: 65536 },
    passphrase: { type: "string", maxLength: 1024 },
  },
} as const;

const bodySchema = {
  type: "object",
  required: ["message", "encryptionKey"],
  additionalProperties: false,
  properties: {
    message: { type: "string", maxLength: 65536 },
    encryptionKey: { type: "string", maxLength: 65536 },
    signingKey: armoredPrivateKeySchema,
  },
} as const;

export default (app: fastify.FastifyInstance): void => {
  app.post<{ Body: EncryptBody }>(
    "/v1/encrypt",
    {
      schema: { body: bodySchema },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      try {
        const data = await encrypt(request.body);
        return reply.header("Cache-Control", "no-store").send({ data });
      } catch (err) {
        request.log.error({ err }, "encrypt failed");
        return reply.status(400).send({ error: "encryption_failed" });
      }
    },
  );
};
