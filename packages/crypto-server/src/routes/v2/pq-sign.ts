/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { classifyCryptoError } from "../../utils/route-helpers";
import {
  KEY_ID_SCHEMA,
  publicView,
  resolveKey,
  storeKey,
} from "../../utils/keys";

/** ML-DSA key algorithms, as stored. */
const ML_DSA_ALGORITHMS = ["ml-dsa-44", "ml-dsa-65", "ml-dsa-87"];

/** `POST /v2/pq/dsa/keygen`: generate and store an ML-DSA key pair. */
function registerKeygen(app: FastifyInstance): void {
  app.post(
    "/v2/pq/dsa/keygen",
    {
      schema: {
        tags: ["Post-Quantum Signatures"],
        summary: "Generate a server-held ML-DSA key pair (FIPS 204)",
        description:
          "Generates an ML-DSA key pair, keeps the secret key on the server and returns its keyId with the public key.",
        body: {
          type: "object",
          required: ["level"],
          additionalProperties: false,
          properties: {
            level: { type: "number", enum: [44, 65, 87] },
          },
        },
      },
    },
    async (request, reply) => {
      const { mlDsaKeygen } =
        await import("@sebastienrousseau/crypto-lib/dist/modern/pq-sign");
      const { level } = request.body as { level: 44 | 65 | 87 };
      const { publicKey, secretKey, algorithm } = mlDsaKeygen(level);
      const stored = await storeKey(
        request,
        algorithm,
        { publicKey },
        { secretKey },
      );
      return reply.send({ data: publicView(stored) });
    },
  );
}

/** `POST /v2/pq/dsa/sign`: ML-DSA signature with a server-held key. */
function registerSign(app: FastifyInstance): void {
  app.post(
    "/v2/pq/dsa/sign",
    {
      schema: {
        tags: ["Post-Quantum Signatures"],
        summary: "Sign with ML-DSA (FIPS 204)",
        description:
          "Signs with a server-held ML-DSA key (keyId from POST /v2/pq/dsa/keygen or POST /v2/keys/generate); the level comes from the key.",
        body: {
          type: "object",
          required: ["keyId", "message"],
          additionalProperties: false,
          properties: {
            keyId: KEY_ID_SCHEMA,
            message: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { mlDsaSign } =
        await import("@sebastienrousseau/crypto-lib/dist/modern/pq-sign");
      const body = request.body as { keyId: string; message: string };
      const key = await resolveKey(request, body.keyId, ML_DSA_ALGORITHMS);
      const level = Number(key.algorithm.slice("ml-dsa-".length)) as
        44 | 65 | 87;
      // A stored ML-DSA key always signs; anything else is a server error.
      return reply.send({
        data: mlDsaSign(level, key.privateParts["secretKey"], body.message),
      });
    },
  );
}

/** `POST /v2/pq/dsa/verify`: ML-DSA verification against a public key. */
function registerVerify(app: FastifyInstance): void {
  app.post(
    "/v2/pq/dsa/verify",
    {
      schema: {
        tags: ["Post-Quantum Signatures"],
        summary: "Verify with ML-DSA (FIPS 204)",
        body: {
          type: "object",
          required: ["level", "publicKey", "message", "signature"],
          additionalProperties: false,
          properties: {
            level: { type: "number", enum: [44, 65, 87] },
            publicKey: { type: "string", minLength: 1 },
            message: { type: "string", minLength: 1 },
            signature: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { mlDsaVerify } =
          await import("@sebastienrousseau/crypto-lib/dist/modern/pq-sign");
        const body = request.body as {
          level: 44 | 65 | 87;
          publicKey: string;
          message: string;
          signature: string;
        };
        return reply.send({
          data: mlDsaVerify(
            body.level,
            body.publicKey,
            body.message,
            body.signature,
          ),
        });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Verification");
      }
    },
  );
}

/** Registers v2 ML-DSA (FIPS 204) post-quantum signature endpoints. */
export default (app: FastifyInstance): void => {
  // ML-DSA (FIPS 204) — Post-Quantum Digital Signatures
  registerKeygen(app);
  registerSign(app);
  registerVerify(app);
};
