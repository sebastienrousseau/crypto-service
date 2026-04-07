/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as fastify from "fastify";
import { sign } from "@sebastienrousseau/crypto-lib";
import type { SignBody } from "../../@types/types";

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
  required: ["message", "signingKey"],
  additionalProperties: false,
  properties: {
    message: { type: "string", maxLength: 65536 },
    signingKey: armoredPrivateKeySchema,
    detached: { type: "boolean" },
  },
} as const;

export default (app: fastify.FastifyInstance): void => {
  app.post<{ Body: SignBody }>(
    "/v1/sign",
    {
      schema: { body: bodySchema },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      try {
        const data = await sign(request.body);
        return reply.header("Cache-Control", "no-store").send({ data });
      } catch (err) {
        request.log.error({ err }, "sign failed");
        return reply.status(400).send({ error: "sign_failed" });
      }
    },
  );
};
