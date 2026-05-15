/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import {
  hash,
  HASH_ALGORITHMS,
} from "@sebastienrousseau/crypto-lib/dist/modern";
import { rejectUnauthorized } from "../../utils/route-helpers";

const hashSchema = {
  tags: ["Hashing"],
  summary: "Compute a cryptographic hash",
  description: "Compute a hash digest using SHA-2, SHA-3, BLAKE2b, or BLAKE3.",
  body: {
    type: "object",
    required: ["algorithm", "data"],
    additionalProperties: false,
    properties: {
      algorithm: { type: "string", enum: [...HASH_ALGORITHMS] },
      data: { type: "string", minLength: 1, maxLength: 10 * 1024 * 1024 },
    },
  },
} as const;

/** Registers the v2 hashing endpoint. */
export default (app: FastifyInstance): void => {
  app.post("/v2/hash", { schema: hashSchema }, async (request, reply) => {
    try {
      if (rejectUnauthorized(request, reply)) return;
      const { algorithm, data } = request.body as {
        algorithm: string;
        data: string;
      };
      const result = hash({
        algorithm: algorithm as (typeof HASH_ALGORITHMS)[number],
        data,
      });
      return reply.send({ data: result });
      /* c8 ignore next 4 -- defensive: schema validates algorithm enum */
    } catch (error) {
      request.log.error(error, "v2 hash failed");
      return reply.status(500).send({ error: "Hash computation failed" });
    }
  });
};
