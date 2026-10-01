/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { classifyCryptoError } from "../../utils/route-helpers";
import type { SlhDsaVariant } from "@sebastienrousseau/crypto-lib/dist/modern/pq-hash-sign";
import {
  KEY_ID_SCHEMA,
  publicView,
  resolveKey,
  storeKey,
} from "../../utils/keys";

/** List of SLH-DSA variants accepted by the v2 hash-sign endpoint. */
const SLH_DSA_VARIANTS = [
  "sha2-128f",
  "sha2-128s",
  "sha2-192f",
  "sha2-192s",
  "sha2-256f",
  "sha2-256s",
  "shake-128f",
  "shake-128s",
  "shake-192f",
  "shake-192s",
  "shake-256f",
  "shake-256s",
];

/** Stored algorithm name of each variant, as crypto-lib reports it. */
const SLH_DSA_ALGORITHMS = SLH_DSA_VARIANTS.map((v) => `slh-dsa-${v}`);

/** `POST /v2/pq/slh-dsa/keygen`: generate and store an SLH-DSA key pair. */
function registerKeygen(app: FastifyInstance): void {
  app.post(
    "/v2/pq/slh-dsa/keygen",
    {
      schema: {
        tags: ["Post-Quantum Hash-Based Signatures"],
        summary: "Generate a server-held SLH-DSA key pair (FIPS 205)",
        description:
          "Generates an SLH-DSA key pair, keeps the secret key on the server and returns its keyId with the public key.",
        body: {
          type: "object",
          required: ["variant"],
          additionalProperties: false,
          properties: {
            variant: { type: "string", enum: SLH_DSA_VARIANTS },
          },
        },
      },
    },
    async (request, reply) => {
      const { slhDsaKeygen } =
        await import("@sebastienrousseau/crypto-lib/dist/modern/pq-hash-sign");
      const { variant } = request.body as { variant: SlhDsaVariant };
      const { publicKey, secretKey, algorithm } = slhDsaKeygen(variant);
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

/** `POST /v2/pq/slh-dsa/sign`: SLH-DSA signature with a server-held key. */
function registerSign(app: FastifyInstance): void {
  app.post(
    "/v2/pq/slh-dsa/sign",
    {
      schema: {
        tags: ["Post-Quantum Hash-Based Signatures"],
        summary: "Sign with SLH-DSA (FIPS 205)",
        description:
          "Signs with a server-held SLH-DSA key (keyId from POST /v2/pq/slh-dsa/keygen); the variant comes from the key.",
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
      const { slhDsaSign } =
        await import("@sebastienrousseau/crypto-lib/dist/modern/pq-hash-sign");
      const body = request.body as { keyId: string; message: string };
      const key = await resolveKey(request, body.keyId, SLH_DSA_ALGORITHMS);
      const variant = key.algorithm.slice("slh-dsa-".length) as SlhDsaVariant;
      // A stored SLH-DSA key always signs; anything else is a server error.
      return reply.send({
        data: slhDsaSign(variant, key.privateParts["secretKey"], body.message),
      });
    },
  );
}

/** `POST /v2/pq/slh-dsa/verify`: SLH-DSA verification against a public key. */
function registerVerify(app: FastifyInstance): void {
  app.post(
    "/v2/pq/slh-dsa/verify",
    {
      schema: {
        tags: ["Post-Quantum Hash-Based Signatures"],
        summary: "Verify with SLH-DSA (FIPS 205)",
        body: {
          type: "object",
          required: ["variant", "publicKey", "message", "signature"],
          additionalProperties: false,
          properties: {
            variant: { type: "string", enum: SLH_DSA_VARIANTS },
            publicKey: { type: "string", minLength: 1 },
            message: { type: "string", minLength: 1 },
            signature: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { slhDsaVerify } =
          await import("@sebastienrousseau/crypto-lib/dist/modern/pq-hash-sign");
        const body = request.body as {
          variant: string;
          publicKey: string;
          message: string;
          signature: string;
        };
        return reply.send({
          data: slhDsaVerify(
            body.variant as SlhDsaVariant,
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

/** Registers v2 SLH-DSA (FIPS 205) hash-based signature endpoints. */
export default (app: FastifyInstance): void => {
  // SLH-DSA (FIPS 205) — Hash-Based Post-Quantum Signatures
  registerKeygen(app);
  registerSign(app);
  registerVerify(app);
};
