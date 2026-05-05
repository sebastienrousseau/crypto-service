/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { rejectUnauthorized } from "../../utils/route-helpers";

export default (app: FastifyInstance): void => {
  app.post(
    "/v2/password/hash",
    {
      schema: {
        tags: ["Password"],
        summary: "Hash a password with Argon2id",
        body: {
          type: "object",
          required: ["password"],
          additionalProperties: false,
          properties: {
            password: { type: "string", minLength: 1, maxLength: 1024 },
            timeCost: { type: "number", minimum: 1, maximum: 20 },
            memoryCost: { type: "number", minimum: 1024, maximum: 1048576 },
            parallelism: { type: "number", minimum: 1, maximum: 16 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { hashPassword } =
          await import("@sebastienrousseau/crypto-lib/dist/modern/password");
        const body = request.body as {
          password: string;
          timeCost?: number;
          memoryCost?: number;
          parallelism?: number;
        };
        const result = hashPassword({
          password: body.password,
          ...(body.timeCost ? { timeCost: body.timeCost } : {}),
          ...(body.memoryCost ? { memoryCost: body.memoryCost } : {}),
          ...(body.parallelism ? { parallelism: body.parallelism } : {}),
        });
        return reply.send({ data: result });
      } catch (error) {
        request.log.error(error, "Password hashing failed");
        return reply.status(500).send({ error: "Password hashing failed" });
      }
    },
  );

  app.post(
    "/v2/password/verify",
    {
      schema: {
        tags: ["Password"],
        summary: "Verify a password against an Argon2id hash",
        body: {
          type: "object",
          required: ["password", "hash", "salt", "params"],
          additionalProperties: false,
          properties: {
            password: { type: "string", minLength: 1, maxLength: 1024 },
            hash: { type: "string", minLength: 1 },
            salt: { type: "string", minLength: 1 },
            params: {
              type: "object",
              properties: {
                t: { type: "number" },
                m: { type: "number" },
                p: { type: "number" },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { verifyPassword } =
          await import("@sebastienrousseau/crypto-lib/dist/modern/password");
        const body = request.body as {
          password: string;
          hash: string;
          salt: string;
          params: { t: number; m: number; p: number };
        };
        const result = verifyPassword(body);
        return reply.send({ data: result });
      } catch (error) {
        request.log.error(error, "Password verification failed");
        return reply
          .status(500)
          .send({ error: "Password verification failed" });
      }
    },
  );
};
