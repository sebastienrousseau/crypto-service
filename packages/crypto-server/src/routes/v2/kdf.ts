/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import {
  kdfDerive,
  KDF_ALGORITHMS,
} from "@sebastienrousseau/crypto-lib/modern";
import { classifyCryptoError } from "../../utils/route-helpers";

/** Fastify JSON Schema for the v2 KDF endpoint. */
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
      // Bounds match crypto-lib's cost limits: larger values would block
      // the event loop for seconds per request.
      params: {
        type: "object",
        additionalProperties: false,
        properties: {
          N: { type: "integer", minimum: 2, maximum: 131072 },
          r: { type: "integer", minimum: 1, maximum: 8 },
          p: { type: "integer", minimum: 1, maximum: 4 },
          iterations: { type: "integer", minimum: 1, maximum: 1000000 },
          info: { type: "string", maxLength: 1024 },
        },
      },
    },
  },
} as const;

/** Registers the v2 key-derivation (Argon2/HKDF) endpoint. */
export default (app: FastifyInstance): void => {
  app.post("/v2/kdf", { schema: kdfSchema }, async (request, reply) => {
    try {
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
      return classifyCryptoError(error, request, reply, "Key derivation");
    }
  });
};
