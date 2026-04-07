/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as fastify from "fastify";
import { session } from "@sebastienrousseau/crypto-lib";
import type { SessionBody } from "../../@types/types";

const bodySchema = {
  type: "object",
  required: ["encryptionKey", "name", "email"],
  additionalProperties: false,
  properties: {
    encryptionKey: { type: "string", maxLength: 65536 },
    name: { type: "string", minLength: 1, maxLength: 128 },
    email: { type: "string", format: "email", maxLength: 256 },
  },
} as const;

export default (app: fastify.FastifyInstance): void => {
  app.post<{ Body: SessionBody }>(
    "/v1/session",
    {
      schema: { body: bodySchema },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      try {
        const sessionKey = await session(request.body);
        // session() returns a Uint8Array on `data`. JSON.stringify would encode
        // it as { "0": x, "1": y, ... } which is unusable; serialize as a hex
        // string the same way the CLI does.
        const data = {
          algorithm: sessionKey.algorithm,
          data: Buffer.from(sessionKey.data).toString("hex"),
        };
        return reply.header("Cache-Control", "no-store").send({ data });
      } catch (err) {
        request.log.error({ err }, "session failed");
        return reply.status(400).send({ error: "session_failed" });
      }
    },
  );
};
