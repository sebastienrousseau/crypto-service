/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { classifyCryptoError } from "../../utils/route-helpers";

/** `POST /v2/password/encrypt`: Argon2id + XChaCha20-Poly1305 on a worker. */
function registerEncrypt(app: FastifyInstance): void {
  app.post(
    "/v2/password/encrypt",
    {
      schema: {
        tags: ["Password Encryption"],
        summary: "Encrypt with password (Argon2id + XChaCha20-Poly1305)",
        description:
          "Derives the key with Argon2id (t = 3, m = 64 MiB, p = 4) on a worker thread.",
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
      const { password, plaintext } = request.body as {
        password: string;
        plaintext: string;
      };
      // Non-empty strings always encrypt; anything else is a server error.
      const result = await request.server.kdf.run<unknown>(
        "passwordEncrypt",
        "passwordEncrypt",
        { password, plaintext },
      );
      return reply.send({ data: result });
    },
  );
}

/** `POST /v2/password/decrypt`: password decryption on a worker thread. */
function registerDecrypt(app: FastifyInstance): void {
  app.post(
    "/v2/password/decrypt",
    {
      schema: {
        tags: ["Password Encryption"],
        summary: "Decrypt with password (Argon2id + XChaCha20-Poly1305)",
        description:
          "Derives the key with the Argon2id parameters stored in the ciphertext, on a worker thread.",
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
        const { password, ciphertext } = request.body as {
          password: string;
          ciphertext: string;
        };
        const plaintext = await request.server.kdf.run<Uint8Array>(
          "passwordEncrypt",
          "passwordDecrypt",
          password,
          ciphertext,
        );
        return reply.send({
          data: Buffer.from(plaintext).toString("utf8"),
        });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Decryption");
      }
    },
  );
}

/** Registers v2 password-based encryption/decryption endpoints. */
export default (app: FastifyInstance): void => {
  registerEncrypt(app);
  registerDecrypt(app);
};
