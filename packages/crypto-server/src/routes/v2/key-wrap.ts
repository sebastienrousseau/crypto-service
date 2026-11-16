/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { classifyCryptoError } from "../../utils/route-helpers";
import { base64, dataRoute, fields, hex } from "../../utils/response-schemas";

/** The `algorithm` of a key-wrap request and result. */
const KW_ALGORITHM = { type: "string", enum: ["aes-kw", "aes-kwp"] } as const;

/** Registers /v2/keys/wrap. */
function registerKeysWrap(app: FastifyInstance): void {
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
            algorithm: KW_ALGORITHM,
          },
        },
        response: dataRoute(
          "The wrapped key.",
          fields({
            wrapped: base64("The wrapped key (RFC 3394 / RFC 5649 output)."),
            algorithm: KW_ALGORITHM,
          }),
        ),
      },
    },
    async (request, reply) => {
      try {
        const { aesKwWrap, aesKwpWrap } =
          await import("@sebastienrousseau/crypto-lib/high-level");
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
        return classifyCryptoError(error, request, reply, "Key wrapping");
      }
    },
  );
}

/** Registers /v2/keys/unwrap. */
function registerKeysUnwrap(app: FastifyInstance): void {
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
            algorithm: KW_ALGORITHM,
          },
        },
        response: dataRoute(
          "The unwrapped key; data is the key itself, not an object.",
          hex("The unwrapped key."),
        ),
      },
    },
    async (request, reply) => {
      try {
        const { aesKwUnwrap, aesKwpUnwrap } =
          await import("@sebastienrousseau/crypto-lib/high-level");
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
        return classifyCryptoError(error, request, reply, "Key unwrapping");
      }
    },
  );
}

/** Registers v2 AES key-wrap and unwrap endpoints. */
export default (app: FastifyInstance): void => {
  registerKeysWrap(app);
  registerKeysUnwrap(app);
};
