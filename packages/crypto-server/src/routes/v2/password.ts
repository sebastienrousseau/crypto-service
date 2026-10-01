/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { classifyCryptoError } from "../../utils/route-helpers";

/** Registers /v2/password/hash. */
function registerPasswordHash(app: FastifyInstance): void {
  app.post(
    "/v2/password/hash",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        tags: ["Password"],
        summary: "Hash a password with Argon2id",
        body: {
          type: "object",
          required: ["password"],
          additionalProperties: false,
          properties: {
            password: { type: "string", minLength: 1, maxLength: 1024 },
            // Bounds match crypto-lib's Argon2 cost limits.
            timeCost: { type: "integer", minimum: 1, maximum: 10 },
            memoryCost: { type: "integer", minimum: 1024, maximum: 262144 },
            parallelism: { type: "integer", minimum: 1, maximum: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { hashPassword } =
          await import("@sebastienrousseau/crypto-lib/modern");
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
        /* c8 ignore next 3 -- schema validation prevents params that could cause hashing to fail */
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Password hashing");
      }
    },
  );
}

/** Registers /v2/password/verify. */
function registerPasswordVerify(app: FastifyInstance): void {
  app.post(
    "/v2/password/verify",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
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
              required: ["t", "m", "p"],
              additionalProperties: false,
              properties: {
                t: { type: "integer", minimum: 1, maximum: 10 },
                m: { type: "integer", minimum: 8, maximum: 262144 },
                p: { type: "integer", minimum: 1, maximum: 8 },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { verifyPassword } =
          await import("@sebastienrousseau/crypto-lib/modern");
        const body = request.body as {
          password: string;
          hash: string;
          salt: string;
          params: { t: number; m: number; p: number };
        };
        const result = verifyPassword(body);
        return reply.send({ data: result });
      } catch (error) {
        return classifyCryptoError(
          error,
          request,
          reply,
          "Password verification",
        );
      }
    },
  );
}

/** Registers v2 password hashing and verification endpoints. */
export default (app: FastifyInstance): void => {
  registerPasswordHash(app);
  registerPasswordVerify(app);
};
