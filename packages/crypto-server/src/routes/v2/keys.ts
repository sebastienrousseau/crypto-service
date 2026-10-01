/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { KEY_ALGORITHMS } from "@sebastienrousseau/crypto-lib/dist/keys/keygen";
import {
  KEY_ID_SCHEMA,
  publicView,
  storeKey,
  resolveKey,
} from "../../utils/keys";

/** `POST /v2/keys/generate`: generate and store a key pair. */
function registerGenerate(app: FastifyInstance): void {
  app.post(
    "/v2/keys/generate",
    {
      schema: {
        tags: ["Key Management"],
        summary: "Generate a server-held key pair for any supported algorithm",
        description:
          "Generates a key pair, keeps the private key on the server and returns its keyId with the public key. Use the keyId with the signing, decryption and decapsulation routes.",
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            algorithm: {
              default: "ed25519",
              type: "string",
              enum: [...KEY_ALGORITHMS],
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
      const { generateKeyPair } =
        await import("@sebastienrousseau/crypto-lib/dist/keys/keygen");
      const { algorithm, metadata } = request.body as {
        algorithm: (typeof KEY_ALGORITHMS)[number];
        metadata?: { kid?: string; use?: "sig" | "enc"; exp?: string };
      };
      const pair = generateKeyPair(algorithm, metadata);
      const stored = await storeKey(
        request,
        pair.algorithm,
        { publicKey: pair.publicKey },
        { privateKey: pair.privateKey },
      );
      return reply.send({
        data: { ...publicView(stored), kid: pair.kid, metadata: pair.metadata },
      });
    },
  );
}

/**
 * `POST /v2/keys/export`: return a server-held key's private parts. The
 * only route that returns private key material; it needs the
 * `crypto:keys:export` scope, which `crypto:admin` does not imply.
 */
function registerExport(app: FastifyInstance): void {
  app.post(
    "/v2/keys/export",
    {
      schema: {
        tags: ["Key Management"],
        summary: "Export a server-held private key",
        description:
          "Returns the private key of a key pair this principal generated. Requires the crypto:keys:export scope, granted explicitly (crypto:admin does not include it).",
        body: {
          type: "object",
          required: ["keyId"],
          additionalProperties: false,
          properties: { keyId: KEY_ID_SCHEMA },
        },
      },
    },
    async (request, reply) => {
      const { keyId } = request.body as { keyId: string };
      // Any algorithm: export is not an operation on the key.
      const key = await resolveKey(request, keyId);
      request.log.warn({ keyId }, "Private key exported");
      return reply.send({
        data: { ...publicView(key), ...key.privateParts },
      });
    },
  );
}

/** Registers the v2 key-generation and key-export endpoints. */
export default (app: FastifyInstance): void => {
  registerGenerate(app);
  registerExport(app);
};
