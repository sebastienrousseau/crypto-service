/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { rejectUnauthorized } from "../../utils/route-helpers";
import type { SlhDsaVariant } from "@sebastienrousseau/crypto-lib/dist/modern/pq-hash-sign";

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

export default (app: FastifyInstance): void => {
  // SLH-DSA (FIPS 205) — Hash-Based Post-Quantum Signatures
  app.post(
    "/v2/pq/slh-dsa/keygen",
    {
      schema: {
        tags: ["Post-Quantum Hash-Based Signatures"],
        summary: "Generate SLH-DSA key pair (FIPS 205)",
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
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { slhDsaKeygen } =
          await import("@sebastienrousseau/crypto-lib/dist/modern/pq-hash-sign");
        const { variant } = request.body as { variant: string };
        return reply.send({ data: slhDsaKeygen(variant as SlhDsaVariant) });
      } catch (error) {
        request.log.error(error, "SLH-DSA keygen failed");
        return reply.status(500).send({ error: "Key generation failed" });
      }
    },
  );

  app.post(
    "/v2/pq/slh-dsa/sign",
    {
      schema: {
        tags: ["Post-Quantum Hash-Based Signatures"],
        summary: "Sign with SLH-DSA (FIPS 205)",
        body: {
          type: "object",
          required: ["variant", "secretKey", "message"],
          additionalProperties: false,
          properties: {
            variant: { type: "string", enum: SLH_DSA_VARIANTS },
            secretKey: { type: "string", minLength: 1 },
            message: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { slhDsaSign } =
          await import("@sebastienrousseau/crypto-lib/dist/modern/pq-hash-sign");
        const body = request.body as {
          variant: string;
          secretKey: string;
          message: string;
        };
        return reply.send({
          data: slhDsaSign(
            body.variant as SlhDsaVariant,
            body.secretKey,
            body.message,
          ),
        });
      } catch (error) {
        request.log.error(error, "SLH-DSA sign failed");
        return reply.status(500).send({ error: "Signing failed" });
      }
    },
  );

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
        if (rejectUnauthorized(request, reply)) return;
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
        request.log.error(error, "SLH-DSA verify failed");
        return reply.status(500).send({ error: "Verification failed" });
      }
    },
  );
};
