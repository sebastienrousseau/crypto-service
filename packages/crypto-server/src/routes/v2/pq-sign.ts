/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { rejectUnauthorized } from "../../utils/route-helpers";

export default (app: FastifyInstance): void => {
  // ML-DSA (FIPS 204) — Post-Quantum Digital Signatures
  app.post(
    "/v2/pq/dsa/keygen",
    {
      schema: {
        tags: ["Post-Quantum Signatures"],
        summary: "Generate ML-DSA key pair (FIPS 204)",
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
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { mlDsaKeygen } =
          await import("@sebastienrousseau/crypto-lib/dist/modern/pq-sign");
        const { level } = request.body as { level: 44 | 65 | 87 };
        return reply.send({ data: mlDsaKeygen(level) });
      } catch (error) {
        request.log.error(error, "ML-DSA keygen failed");
        return reply.status(500).send({ error: "Key generation failed" });
      }
    },
  );

  app.post(
    "/v2/pq/dsa/sign",
    {
      schema: {
        tags: ["Post-Quantum Signatures"],
        summary: "Sign with ML-DSA (FIPS 204)",
        body: {
          type: "object",
          required: ["level", "secretKey", "message"],
          additionalProperties: false,
          properties: {
            level: { type: "number", enum: [44, 65, 87] },
            secretKey: { type: "string", minLength: 1 },
            message: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { mlDsaSign } =
          await import("@sebastienrousseau/crypto-lib/dist/modern/pq-sign");
        const body = request.body as {
          level: 44 | 65 | 87;
          secretKey: string;
          message: string;
        };
        return reply.send({
          data: mlDsaSign(body.level, body.secretKey, body.message),
        });
      } catch (error) {
        request.log.error(error, "ML-DSA sign failed");
        return reply.status(500).send({ error: "Signing failed" });
      }
    },
  );

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
        if (rejectUnauthorized(request, reply)) return;
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
        request.log.error(error, "ML-DSA verify failed");
        return reply.status(500).send({ error: "Verification failed" });
      }
    },
  );
};
