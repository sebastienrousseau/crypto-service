/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import type {
  HashPasswordResult,
  VerifyPasswordResult,
} from "@sebastienrousseau/crypto-lib/modern";
import { classifyCryptoError } from "../../utils/route-helpers";
import {
  dataRoute,
  fields,
  flag,
  hex,
  integer,
  literal,
} from "../../utils/response-schemas";

/** Argon2id parameters, as the hash route answers and verify takes them. */
const ARGON2_PARAMS = fields(
  {
    t: integer("Passes (time cost)."),
    m: integer("Memory in KiB."),
    p: integer("Lanes (parallelism)."),
  },
  "Argon2id parameters; pass them back to verify.",
);

/** What `POST /v2/password/hash` answers (503: the worker pool is busy). */
const HASH_RESPONSE = dataRoute(
  "The Argon2id hash and everything needed to verify it.",
  fields({
    hash: hex("The 32-byte Argon2id hash."),
    salt: hex("The random 16-byte salt."),
    params: ARGON2_PARAMS,
    algorithm: literal("argon2id", "Password hashing algorithm."),
    phc: {
      type: "string",
      description:
        "The same hash as a PHC string ($argon2id$v=19$m=..,t=..,p=..$salt$hash, unpadded base64 fields).",
    },
  }),
  503,
);

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
        response: HASH_RESPONSE,
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
        "modern",
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
        response: dataRoute(
          "Whether the password matches the hash.",
          fields({ valid: flag("Whether the password matches.") }),
          503,
        ),
      },
    },
    async (request, reply) => {
      try {
        const result = await request.server.kdf.run<VerifyPasswordResult>(
          "modern",
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
