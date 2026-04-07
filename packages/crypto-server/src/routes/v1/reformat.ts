/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as fastify from "fastify";
import { reformat } from "@sebastienrousseau/crypto-lib";
import type { ReformatBody } from "../../@types/types";

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
  required: ["privateKey", "name", "email"],
  additionalProperties: false,
  properties: {
    privateKey: armoredPrivateKeySchema,
    name: { type: "string", minLength: 1, maxLength: 128 },
    email: { type: "string", format: "email", maxLength: 256 },
    keyExpirationTime: { type: "integer", minimum: 0 },
  },
} as const;

export default (app: fastify.FastifyInstance): void => {
  app.post<{ Body: ReformatBody }>(
    "/v1/reformat",
    {
      schema: { body: bodySchema },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      try {
        const data = await reformat(request.body);
        return reply.header("Cache-Control", "no-store").send({ data });
      } catch (err) {
        request.log.error({ err }, "reformat failed");
        return reply.status(400).send({ error: "reformat_failed" });
      }
    },
  );
};
