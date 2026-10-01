/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import {
  KDF_ALGORITHMS,
  type KdfDeriveOptions,
  type KdfResult,
} from "@sebastienrousseau/crypto-lib/modern";
import { classifyCryptoError } from "../../utils/route-helpers";

/**
 * OWASP Password Storage Cheat Sheet floors for deriving new keys:
 * scrypt N >= 2^17 with r = 8 and p >= 1, PBKDF2-HMAC-SHA256 >= 600,000
 * iterations. crypto-lib caps scrypt N at 2^17 (128 MiB with r = 8), so
 * N is exactly 2^17; the library defaults already meet every floor.
 */
export const KDF_FLOORS = Object.freeze({
  scryptN: 131072,
  scryptR: 8,
  pbkdf2Iterations: 600_000,
});

/** Fastify JSON Schema for the v2 KDF endpoint. */
const kdfSchema = {
  tags: ["Key Derivation"],
  summary: "Derive a key from a password",
  description:
    "Key derivation using scrypt (N = 2^17, r = 8), HKDF-SHA256, or PBKDF2-SHA256 (>= 600,000 iterations). Runs on a worker thread.",
  body: {
    type: "object",
    required: ["algorithm", "password"],
    additionalProperties: false,
    properties: {
      algorithm: { type: "string", enum: [...KDF_ALGORITHMS] },
      password: { type: "string", minLength: 1, maxLength: 1024 },
      salt: { type: "string", maxLength: 128 },
      keyLength: { type: "number", minimum: 16, maximum: 64 },
      // Floors from OWASP; maximums match crypto-lib's cost limits.
      params: {
        type: "object",
        additionalProperties: false,
        properties: {
          N: {
            type: "integer",
            minimum: KDF_FLOORS.scryptN,
            // crypto-lib caps N at 2^17 (MAX_SCRYPT_N), the floor itself.
            maximum: KDF_FLOORS.scryptN,
          },
          r: {
            type: "integer",
            minimum: KDF_FLOORS.scryptR,
            maximum: KDF_FLOORS.scryptR,
          },
          p: { type: "integer", minimum: 1, maximum: 4 },
          iterations: {
            type: "integer",
            minimum: KDF_FLOORS.pbkdf2Iterations,
            maximum: 1000000,
          },
          info: { type: "string", maxLength: 1024 },
        },
      },
    },
  },
} as const;

/** Registers the v2 key-derivation (scrypt/HKDF/PBKDF2) endpoint. */
export default (app: FastifyInstance): void => {
  app.post("/v2/kdf", { schema: kdfSchema }, async (request, reply) => {
    try {
      const body = request.body as KdfDeriveOptions;
      const options: KdfDeriveOptions = {
        algorithm: body.algorithm,
        password: body.password,
        ...(body.salt ? { salt: body.salt } : {}),
        ...(body.keyLength ? { keyLength: body.keyLength } : {}),
        ...(body.params ? { params: body.params } : {}),
      };
      const result = await request.server.kdf.run<KdfResult>(
        "modern",
        "kdfDerive",
        options,
      );
      return reply.send({ data: result });
    } catch (error) {
      return classifyCryptoError(error, request, reply, "Key derivation");
    }
  });
};
