/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import {
  rejectUnauthorized,
  classifyCryptoError,
} from "../../utils/route-helpers";

/** Registers v2 multi-recipient encryption/decryption endpoints. */
export default (app: FastifyInstance): void => {
  app.post(
    "/v2/multi-recipient/encrypt",
    {
      schema: {
        tags: ["Multi-Recipient"],
        summary: "Encrypt for multiple recipients (hybrid key wrapping)",
        body: {
          type: "object",
          required: ["plaintext", "recipients"],
          additionalProperties: false,
          properties: {
            plaintext: { type: "string", minLength: 1 },
            recipients: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["type", "publicKey"],
                properties: {
                  type: {
                    type: "string",
                    enum: ["classical", "pq"],
                  },
                  publicKey: { type: "string", minLength: 1 },
                  mlKemPublicKey: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { multiEncrypt } =
          await import("@sebastienrousseau/crypto-lib/dist/high-level/multi-recipient");
        const { plaintext, recipients } = request.body as {
          plaintext: string;
          recipients: Array<{
            type: "classical" | "pq";
            publicKey: string;
            mlKemPublicKey?: string;
          }>;
        };

        // Map route types to library types
        const libRecipients = recipients.map((r) => {
          if (r.type === "classical") {
            return { type: "x25519" as const, publicKey: r.publicKey };
          }
          return {
            type: "x25519-ml-kem-768" as const,
            x25519PublicKey: r.publicKey,
            mlKemPublicKey: r.mlKemPublicKey!,
          };
        });

        return reply.send({ data: multiEncrypt(libRecipients, plaintext) });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Encryption");
      }
    },
  );
};
