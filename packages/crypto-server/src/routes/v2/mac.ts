/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { rejectUnauthorized } from "../../utils/route-helpers";
import type { HmacAlgorithm } from "@sebastienrousseau/crypto-lib/dist/modern/mac";

const HMAC_ALGORITHMS = ["sha256", "sha384", "sha512", "sha3-256", "sha3-512"];

export default (app: FastifyInstance): void => {
  app.post(
    "/v2/hmac",
    {
      schema: {
        tags: ["MAC"],
        summary: "Compute an HMAC",
        body: {
          type: "object",
          required: ["algorithm", "key", "data"],
          additionalProperties: false,
          properties: {
            algorithm: { type: "string", enum: HMAC_ALGORITHMS },
            key: { type: "string", minLength: 1 },
            data: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { computeHmac } =
          await import("@sebastienrousseau/crypto-lib/dist/modern/mac");
        const body = request.body as {
          algorithm: string;
          key: string;
          data: string;
        };
        const result = computeHmac({
          algorithm: body.algorithm as HmacAlgorithm,
          key: body.key,
          data: body.data,
        });
        return reply.send({ data: result });
      } catch (error) {
        request.log.error(error, "HMAC computation failed");
        return reply.status(500).send({ error: "HMAC computation failed" });
      }
    },
  );

  app.post(
    "/v2/hmac/verify",
    {
      schema: {
        tags: ["MAC"],
        summary: "Verify an HMAC",
        body: {
          type: "object",
          required: ["algorithm", "key", "data", "mac"],
          additionalProperties: false,
          properties: {
            algorithm: { type: "string", enum: HMAC_ALGORITHMS },
            key: { type: "string", minLength: 1 },
            data: { type: "string", minLength: 1 },
            mac: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { verifyHmac } =
          await import("@sebastienrousseau/crypto-lib/dist/modern/mac");
        const body = request.body as {
          algorithm: string;
          key: string;
          data: string;
          mac: string;
        };
        const result = verifyHmac({
          algorithm: body.algorithm as HmacAlgorithm,
          key: body.key,
          data: body.data,
          mac: body.mac,
        });
        return reply.send({ data: result });
      } catch (error) {
        request.log.error(error, "HMAC verification failed");
        return reply.status(500).send({ error: "HMAC verification failed" });
      }
    },
  );
};
