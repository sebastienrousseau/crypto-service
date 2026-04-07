/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as fastify from "fastify";
import { decrypt } from "@sebastienrousseau/crypto-lib";
import type { DecryptBody } from "../../@types/types";

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
  required: ["encryptedMessage", "decryptionKey"],
  additionalProperties: false,
  properties: {
    encryptedMessage: { type: "string", maxLength: 131072 },
    decryptionKey: armoredPrivateKeySchema,
    verificationKey: { type: "string", maxLength: 65536 },
  },
} as const;

export default (app: fastify.FastifyInstance): void => {
  app.post<{ Body: DecryptBody }>(
    "/v1/decrypt",
    {
      schema: { body: bodySchema },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      try {
        const data = await decrypt(request.body);
        return reply.header("Cache-Control", "no-store").send({ data });
      } catch (err) {
        request.log.error({ err }, "decrypt failed");
        return reply.status(400).send({ error: "decryption_failed" });
      }
    },
  );
};
