/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import {
  aeadEncrypt,
  aeadDecrypt,
} from "@sebastienrousseau/crypto-lib/dist/modern";
import { rejectUnauthorized } from "../../utils/route-helpers";

const encryptSchema = {
  tags: ["Modern Encryption"],
  summary: "Encrypt with XChaCha20-Poly1305",
  description:
    "AEAD encryption using XChaCha20-Poly1305. Returns base64(nonce || ciphertext || tag).",
  body: {
    type: "object",
    required: ["key", "plaintext"],
    additionalProperties: false,
    properties: {
      key: {
        type: "string",
        minLength: 64,
        maxLength: 64,
        description: "256-bit key as hex (64 chars)",
      },
      plaintext: { type: "string", minLength: 1, maxLength: 10 * 1024 * 1024 },
    },
  },
} as const;

const decryptSchema = {
  tags: ["Modern Encryption"],
  summary: "Decrypt with XChaCha20-Poly1305",
  description:
    "AEAD decryption. Expects base64 blob from the encrypt endpoint.",
  body: {
    type: "object",
    required: ["key", "ciphertext"],
    additionalProperties: false,
    properties: {
      key: { type: "string", minLength: 64, maxLength: 64 },
      ciphertext: { type: "string", minLength: 1 },
    },
  },
} as const;

/** Registers v2 symmetric encryption/decryption routes. */
export default (app: FastifyInstance): void => {
  app.post("/v2/encrypt", { schema: encryptSchema }, async (request, reply) => {
    try {
      if (rejectUnauthorized(request, reply)) return;
      const { key, plaintext } = request.body as {
        key: string;
        plaintext: string;
      };
      const result = aeadEncrypt({ key, plaintext });
      return reply.send({ data: result });
    } catch (error) {
      request.log.error(error, "v2 encryption failed");
      return reply.status(500).send({ error: "Encryption failed" });
    }
  });

  app.post("/v2/decrypt", { schema: decryptSchema }, async (request, reply) => {
    try {
      if (rejectUnauthorized(request, reply)) return;
      const { key, ciphertext } = request.body as {
        key: string;
        ciphertext: string;
      };
      const plaintext = aeadDecrypt({ key, ciphertext });
      return reply.send({
        data: { plaintext: Buffer.from(plaintext).toString("utf8") },
      });
    } catch (error) {
      request.log.error(error, "v2 decryption failed");
      return reply.status(500).send({ error: "Decryption failed" });
    }
  });
};
