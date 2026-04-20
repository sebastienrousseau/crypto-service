/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import {
  kdfDerive,
  KDF_ALGORITHMS,
} from "@sebastienrousseau/crypto-lib/dist/modern";
import { rejectUnauthorized } from "../../utils/route-helpers";

const kdfSchema = {
  tags: ["Key Derivation"],
  summary: "Derive a key from a password",
  description: "Key derivation using scrypt, HKDF-SHA256, or PBKDF2-SHA256.",
  body: {
    type: "object",
    required: ["algorithm", "password"],
    additionalProperties: false,
    properties: {
      algorithm: { type: "string", enum: [...KDF_ALGORITHMS] },
      password: { type: "string", minLength: 1, maxLength: 1024 },
      salt: { type: "string", maxLength: 128 },
      keyLength: { type: "number", minimum: 16, maximum: 64 },
      params: {
        type: "object",
        properties: {
          N: { type: "number" },
          r: { type: "number" },
          p: { type: "number" },
          iterations: { type: "number" },
          info: { type: "string" },
        },
      },
    },
  },
} as const;

export default (app: FastifyInstance): void => {
  app.post("/v2/kdf", { schema: kdfSchema }, async (request, reply) => {
    try {
      if (rejectUnauthorized(request, reply)) return;
      const body = request.body as {
        algorithm: string;
        password: string;
        salt?: string;
        keyLength?: number;
        params?: Record<string, unknown>;
      };
      const result = kdfDerive({
        algorithm: body.algorithm as (typeof KDF_ALGORITHMS)[number],
        password: body.password,
        ...(body.salt ? { salt: body.salt } : {}),
        ...(body.keyLength ? { keyLength: body.keyLength } : {}),
        ...(body.params
          ? {
              params: body.params as {
                N?: number;
                r?: number;
                p?: number;
                iterations?: number;
                info?: string;
              },
            }
          : {}),
      });
      return reply.send({ data: result });
    } catch (error) {
      request.log.error(error, "v2 KDF failed");
      return reply.status(500).send({ error: "Key derivation failed" });
    }
  });
};
