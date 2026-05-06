/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { rejectUnauthorized } from "../../utils/route-helpers";

export default (app: FastifyInstance): void => {
  app.post(
    "/v2/password/encrypt",
    {
      schema: {
        tags: ["Password Encryption"],
        summary: "Encrypt with password (Argon2id + XChaCha20-Poly1305)",
        body: {
          type: "object",
          required: ["password", "plaintext"],
          additionalProperties: false,
          properties: {
            password: { type: "string", minLength: 1 },
            plaintext: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { passwordEncrypt } =
          await import("@sebastienrousseau/crypto-lib/dist/high-level/password-encrypt");
        const { password, plaintext } = request.body as {
          password: string;
          plaintext: string;
        };
        return reply.send({
          data: passwordEncrypt({ password, plaintext }),
        });
        /* c8 ignore next 4 -- passwordEncrypt only fails with invalid inputs blocked by schema */
      } catch (error) {
        request.log.error(error, "Password encrypt failed");
        return reply.status(500).send({ error: "Encryption failed" });
      }
    },
  );

  app.post(
    "/v2/password/decrypt",
    {
      schema: {
        tags: ["Password Encryption"],
        summary: "Decrypt with password (Argon2id + XChaCha20-Poly1305)",
        body: {
          type: "object",
          required: ["password", "ciphertext"],
          additionalProperties: false,
          properties: {
            password: { type: "string", minLength: 1 },
            ciphertext: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { passwordDecrypt } =
          await import("@sebastienrousseau/crypto-lib/dist/high-level/password-encrypt");
        const { password, ciphertext } = request.body as {
          password: string;
          ciphertext: string;
        };
        const plaintext = passwordDecrypt(password, ciphertext);
        return reply.send({
          data: Buffer.from(plaintext).toString("utf8"),
        });
      } catch (error) {
        request.log.error(error, "Password decrypt failed");
        return reply.status(500).send({ error: "Decryption failed" });
      }
    },
  );
};
