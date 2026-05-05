/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { rejectUnauthorized } from "../../utils/route-helpers";

export default (app: FastifyInstance): void => {
  app.post(
    "/v2/secretbox/seal",
    {
      schema: {
        tags: ["Secretbox"],
        summary: "Encrypt with XChaCha20-Poly1305 (secretbox seal)",
        body: {
          type: "object",
          required: ["key", "plaintext"],
          additionalProperties: false,
          properties: {
            key: { type: "string", minLength: 1 },
            plaintext: { type: "string", minLength: 1 },
            aad: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { seal } =
          await import("@sebastienrousseau/crypto-lib/dist/high-level/secretbox");
        const { key, plaintext, aad } = request.body as {
          key: string;
          plaintext: string;
          aad?: string;
        };
        const aadBytes = aad ? Buffer.from(aad, "utf8") : undefined;
        return reply.send({ data: seal(key, plaintext, aadBytes) });
      } catch (error) {
        request.log.error(error, "Secretbox seal failed");
        return reply.status(500).send({ error: "Encryption failed" });
      }
    },
  );

  app.post(
    "/v2/secretbox/open",
    {
      schema: {
        tags: ["Secretbox"],
        summary: "Decrypt with XChaCha20-Poly1305 (secretbox open)",
        body: {
          type: "object",
          required: ["key", "ciphertext"],
          additionalProperties: false,
          properties: {
            key: { type: "string", minLength: 1 },
            ciphertext: { type: "string", minLength: 1 },
            aad: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { open } =
          await import("@sebastienrousseau/crypto-lib/dist/high-level/secretbox");
        const { key, ciphertext, aad } = request.body as {
          key: string;
          ciphertext: string;
          aad?: string;
        };
        const aadBytes = aad ? Buffer.from(aad, "utf8") : undefined;
        const plaintext = open(key, ciphertext, aadBytes);
        return reply.send({
          data: Buffer.from(plaintext).toString("utf8"),
        });
      } catch (error) {
        request.log.error(error, "Secretbox open failed");
        return reply.status(500).send({ error: "Decryption failed" });
      }
    },
  );
};
