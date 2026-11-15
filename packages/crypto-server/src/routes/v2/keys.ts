/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import {
  KEY_ALGORITHMS,
  type generateKeyPair,
} from "@sebastienrousseau/crypto-lib/keys";
import {
  KEY_ID_SCHEMA,
  deleteKey,
  publicView,
  storeKey,
  resolveKey,
} from "../../utils/keys";
import {
  KEY_ALGORITHM,
  KEY_ID,
  dataRoute,
  fields,
  hex,
} from "../../utils/response-schemas";

/** JWK-style metadata of a generated key pair. */
const KEY_METADATA = {
  type: "object",
  description: "Key metadata: the request's, with kid always set.",
  required: ["kid"],
  properties: {
    kid: { type: "string", description: "Key identifier (JWK kid)." },
    use: { type: "string", enum: ["sig", "enc"] },
    exp: { type: "string", description: "Expiry, as the request gave it." },
  },
} as const;

/**
 * What `POST /v2/keys/generate` answers. 429: the principal's key quota
 * is reached; 503: the key store is full or the signing pool is busy.
 */
const GENERATE_RESPONSE = dataRoute(
  "The keyId and public key of the new server-held key pair.",
  fields({
    keyId: KEY_ID,
    algorithm: { type: "string", enum: [...KEY_ALGORITHMS] },
    publicKey: hex("The public key."),
    kid: {
      type: "string",
      description:
        "Key identifier: the request's metadata.kid, or base64url of the first 16 bytes of SHA-256(public key).",
    },
    metadata: KEY_METADATA,
  }),
  503,
);

/**
 * What `POST /v2/keys/export` answers: the key's public and private
 * parts. Their names depend on the route that generated the key.
 */
const EXPORT_RESPONSE = dataRoute(
  "The public and private parts of a server-held key.",
  {
    type: "object",
    required: ["keyId", "algorithm"],
    properties: {
      keyId: KEY_ID,
      algorithm: KEY_ALGORITHM,
      publicKey: hex("Public key (single-key algorithms)."),
      x25519PublicKey: hex("X25519 public key (x25519-ml-kem-768)."),
      mlKemPublicKey: hex("ML-KEM-768 public key (x25519-ml-kem-768)."),
      privateKey: hex(
        "Private key (POST /v2/keys/generate and POST /v2/hpke/keygen).",
      ),
      secretKey: hex(
        "Secret key (POST /v2/pq/keygen, /v2/pq/dsa/keygen, /v2/pq/slh-dsa/keygen).",
      ),
      x25519PrivateKey: hex("X25519 private key (x25519-ml-kem-768)."),
      mlKemSecretKey: hex("ML-KEM-768 secret key (x25519-ml-kem-768)."),
    },
    additionalProperties: hex("Another key part."),
  },
  404,
);

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
        response: GENERATE_RESPONSE,
      },
    },
    async (request, reply) => {
      const { algorithm, metadata } = request.body as {
        algorithm: (typeof KEY_ALGORITHMS)[number];
        metadata?: { kid?: string; use?: "sig" | "enc"; exp?: string };
      };
      // ML-DSA key generation is CPU-bound; it runs on the signing pool.
      const pair = algorithm.startsWith("ml-dsa-")
        ? await request.server.signer.run<ReturnType<typeof generateKeyPair>>(
            "keys",
            "generateKeyPair",
            algorithm,
            metadata,
          )
        : (await import("@sebastienrousseau/crypto-lib/keys")).generateKeyPair(
            algorithm,
            metadata,
          );
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
        response: EXPORT_RESPONSE,
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

/**
 * `POST /v2/keys/delete`: delete a server-held key of this principal,
 * freeing its place in the per-principal quota.
 */
function registerDelete(app: FastifyInstance): void {
  app.post(
    "/v2/keys/delete",
    {
      schema: {
        tags: ["Key Management"],
        summary: "Delete a server-held key",
        description:
          "Deletes a key pair this principal generated, from memory and from disk. Another principal's key answers 404.",
        body: {
          type: "object",
          required: ["keyId"],
          additionalProperties: false,
          properties: { keyId: KEY_ID_SCHEMA },
        },
        response: dataRoute(
          "The key is deleted.",
          fields({
            keyId: KEY_ID,
            deleted: {
              type: "boolean",
              enum: [true],
              description: "Always true.",
            },
          }),
          404,
        ),
      },
    },
    async (request, reply) => {
      const { keyId } = request.body as { keyId: string };
      await deleteKey(request, keyId);
      request.log.info({ keyId }, "Key deleted");
      return reply.send({ data: { keyId, deleted: true } });
    },
  );
}

/** Registers the v2 key-generation, key-export and key-deletion endpoints. */
export default (app: FastifyInstance): void => {
  registerGenerate(app);
  registerExport(app);
  registerDelete(app);
};
