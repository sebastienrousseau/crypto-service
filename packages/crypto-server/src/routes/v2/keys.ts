/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { rejectUnauthorized } from "../../utils/route-helpers";

export default (app: FastifyInstance): void => {
  app.post(
    "/v2/keys/generate",
    {
      schema: {
        tags: ["Key Management"],
        summary: "Generate a key pair for any supported algorithm",
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            algorithm: {
              default: "ed25519",
              type: "string",
              enum: [
                "ed25519",
                "x25519",
                "ed448",
                "x448",
                "p256",
                "p384",
                "ml-kem-512",
                "ml-kem-768",
                "ml-kem-1024",
                "ml-dsa-44",
                "ml-dsa-65",
                "ml-dsa-87",
              ],
            },
            metadata: {
              type: "object",
              additionalProperties: false,
              properties: {
                kid: { type: "string" },
                use: { type: "string", enum: ["sig", "enc"] },
                exp: { type: "string" },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { generateKeyPair } =
          await import("@sebastienrousseau/crypto-lib/dist/keys/keygen");
        const { algorithm, metadata } = request.body as {
          algorithm: string;
          metadata?: { kid?: string; use?: "sig" | "enc"; exp?: string };
        };
        const result = generateKeyPair(algorithm as never, metadata);
        return reply.send({ data: result });
        /* c8 ignore next 4 -- schema enum validation prevents invalid algorithms */
      } catch (error) {
        request.log.error(error, "Key generation failed");
        return reply.status(500).send({ error: "Key generation failed" });
      }
    },
  );
};
