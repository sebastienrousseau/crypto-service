/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as fastify from "fastify";
import { verify, type VerifyInput } from "@sebastienrousseau/crypto-lib";
import type { VerifyBody } from "../../@types/types";

const bodySchema = {
  type: "object",
  required: ["message", "verificationKey"],
  additionalProperties: false,
  properties: {
    message: { type: "string", maxLength: 131072 },
    verificationKey: { type: "string", maxLength: 65536 },
    signature: { type: "string", maxLength: 65536 },
    date: { type: "string", format: "date-time" },
  },
} as const;

export default (app: fastify.FastifyInstance): void => {
  app.post<{ Body: VerifyBody }>(
    "/v1/verify",
    {
      schema: { body: bodySchema },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      try {
        const args: VerifyInput = {
          message: request.body.message,
          verificationKey: request.body.verificationKey,
        };
        if (request.body.signature !== undefined)
          args.signature = request.body.signature;
        if (request.body.date !== undefined)
          args.date = new Date(request.body.date);

        const data = await verify(args);
        return reply.header("Cache-Control", "no-store").send({ data });
      } catch (err) {
        request.log.error({ err }, "verify failed");
        return reply.status(400).send({ error: "verify_failed" });
      }
    },
  );
};
