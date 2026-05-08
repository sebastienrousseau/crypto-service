/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { rejectUnauthorized } from "../../utils/route-helpers";

/** Registers v2 AES key-wrap and unwrap endpoints. */
export default (app: FastifyInstance): void => {
  app.post(
    "/v2/keys/wrap",
    {
      schema: {
        tags: ["Key Wrapping"],
        summary: "Wrap a key using AES-KW or AES-KWP (RFC 3394/5649)",
        body: {
          type: "object",
          required: ["kek", "keyToWrap"],
          additionalProperties: false,
          properties: {
            kek: { type: "string", minLength: 1 },
            keyToWrap: { type: "string", minLength: 1 },
            algorithm: { type: "string", enum: ["aes-kw", "aes-kwp"] },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { aesKwWrap, aesKwpWrap } =
          await import("@sebastienrousseau/crypto-lib/dist/high-level/key-wrap");
        const { kek, keyToWrap, algorithm } = request.body as {
          kek: string;
          keyToWrap: string;
          algorithm?: "aes-kw" | "aes-kwp";
        };
        const result =
          algorithm === "aes-kwp"
            ? aesKwpWrap(kek, keyToWrap)
            : aesKwWrap(kek, keyToWrap);
        return reply.send({ data: result });
      } catch (error) {
        request.log.error(error, "Key wrap failed");
        return reply.status(500).send({ error: "Key wrapping failed" });
      }
    },
  );

  app.post(
    "/v2/keys/unwrap",
    {
      schema: {
        tags: ["Key Wrapping"],
        summary: "Unwrap a key using AES-KW or AES-KWP (RFC 3394/5649)",
        body: {
          type: "object",
          required: ["kek", "wrappedKey"],
          additionalProperties: false,
          properties: {
            kek: { type: "string", minLength: 1 },
            wrappedKey: { type: "string", minLength: 1 },
            algorithm: { type: "string", enum: ["aes-kw", "aes-kwp"] },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { aesKwUnwrap, aesKwpUnwrap } =
          await import("@sebastienrousseau/crypto-lib/dist/high-level/key-wrap");
        const { kek, wrappedKey, algorithm } = request.body as {
          kek: string;
          wrappedKey: string;
          algorithm?: "aes-kw" | "aes-kwp";
        };
        const result =
          algorithm === "aes-kwp"
            ? aesKwpUnwrap(kek, wrappedKey)
            : aesKwUnwrap(kek, wrappedKey);
        return reply.send({
          data: Buffer.from(result).toString("hex"),
        });
      } catch (error) {
        request.log.error(error, "Key unwrap failed");
        return reply.status(500).send({ error: "Key unwrapping failed" });
      }
    },
  );
};
