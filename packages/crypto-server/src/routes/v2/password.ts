/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import type {
  HashPasswordResult,
  VerifyPasswordResult,
} from "@sebastienrousseau/crypto-lib/dist/modern/password";
import { classifyCryptoError } from "../../utils/route-helpers";

/**
 * OWASP Password Storage Cheat Sheet floor for new Argon2id hashes:
 * 19 MiB of memory and two passes. Verification still accepts the
 * parameters of existing hashes down to crypto-lib's own minimums.
 */
export const ARGON2_FLOORS = Object.freeze({
  memoryCostKiB: 19456,
  timeCost: 2,
});

/** `POST /v2/password/hash`: Argon2id hash on a worker thread. */
function registerHash(app: FastifyInstance): void {
  app.post(
    "/v2/password/hash",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        tags: ["Password"],
        summary: "Hash a password with Argon2id",
        description:
          "Argon2id with at least 19 MiB of memory and two passes (OWASP); defaults are t = 3, m = 64 MiB, p = 4. Runs on a worker thread.",
        body: {
          type: "object",
          required: ["password"],
          additionalProperties: false,
          properties: {
            password: { type: "string", minLength: 1, maxLength: 1024 },
            // Floors from OWASP; maximums match crypto-lib's Argon2 limits.
            timeCost: {
              type: "integer",
              minimum: ARGON2_FLOORS.timeCost,
              maximum: 10,
            },
            memoryCost: {
              type: "integer",
              minimum: ARGON2_FLOORS.memoryCostKiB,
              maximum: 262144,
            },
            parallelism: { type: "integer", minimum: 1, maximum: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        password: string;
        timeCost?: number;
        memoryCost?: number;
        parallelism?: number;
      };
      // The schema bounds every cost, so hashing cannot fail on input.
      const result = await request.server.kdf.run<HashPasswordResult>(
        "password",
        "hashPassword",
        body,
      );
      return reply.send({ data: result });
    },
  );
}

/** `POST /v2/password/verify`: Argon2id verification on a worker thread. */
function registerVerify(app: FastifyInstance): void {
  app.post(
    "/v2/password/verify",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        tags: ["Password"],
        summary: "Verify a password against an Argon2id hash",
        description:
          "Accepts the parameters of existing hashes, including ones below the floor for new hashes. Runs on a worker thread.",
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
        const result = await request.server.kdf.run<VerifyPasswordResult>(
          "password",
          "verifyPassword",
          request.body,
        );
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
  registerHash(app);
  registerVerify(app);
};
