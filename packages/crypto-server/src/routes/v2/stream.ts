// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import type { FastifyInstance } from "fastify";
import { ed25519Sign, ed25519Verify } from "@sebastienrousseau/crypto-lib";
import {
  verifyIso20022Payment,
  type Iso20022DualSignatureEnvelope,
} from "@sebastienrousseau/crypto-lib/dist/protocols/iso20022";
import {
  rejectUnauthorized,
  classifyCryptoError,
} from "../../utils/route-helpers";

interface StreamSignItem {
  id: string;
  message: string;
  privateKey: string;
}

interface StreamVerifyItem {
  id: string;
  message: string;
  signature: string;
  publicKey: string;
}

/** Registers high-throughput streaming and batch cryptographic pipeline endpoints. */
export default (app: FastifyInstance): void => {
  // Batch/Streaming Signing Pipeline
  app.post(
    "/v2/stream/sign",
    {
      schema: {
        tags: ["Streaming"],
        summary: "Batch sign messages with sub-millisecond throughput",
        description:
          "Process high-throughput batch digital signing operations over multiple payloads.",
        body: {
          type: "object",
          required: ["items"],
          additionalProperties: false,
          properties: {
            items: {
              type: "array",
              minItems: 1,
              maxItems: 1000,
              items: {
                type: "object",
                required: ["id", "message", "privateKey"],
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  message: { type: "string", minLength: 1 },
                  privateKey: { type: "string", minLength: 64, maxLength: 64 },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { items } = request.body as { items: StreamSignItem[] };

        const signatures = items.map((item) => {
          const res = ed25519Sign(item.privateKey, item.message);
          return {
            id: item.id,
            signature: res.signature,
            algorithm: "ed25519" as const,
          };
        });

        return reply.send({
          data: {
            count: signatures.length,
            signatures,
          },
        });
        /* c8 ignore next 3 -- defensive: batch signing handles internal errors */
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Batch signing");
      }
    },
  );

  // Batch/Streaming Signature Verification Pipeline
  app.post(
    "/v2/stream/verify",
    {
      schema: {
        tags: ["Streaming"],
        summary: "Batch verify digital signatures",
        description:
          "Batch verification pipeline for high-concurrency payment and transaction verification.",
        body: {
          type: "object",
          required: ["items"],
          additionalProperties: false,
          properties: {
            items: {
              type: "array",
              minItems: 1,
              maxItems: 1000,
              items: {
                type: "object",
                required: ["id", "message", "signature", "publicKey"],
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  message: { type: "string", minLength: 1 },
                  signature: { type: "string", minLength: 1 },
                  publicKey: { type: "string", minLength: 64, maxLength: 64 },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { items } = request.body as { items: StreamVerifyItem[] };

        let validCount = 0;
        const results = items.map((item) => {
          try {
            const res = ed25519Verify(
              item.publicKey,
              item.message,
              item.signature,
            );
            if (res.valid) validCount++;
            return { id: item.id, valid: res.valid };
          } catch {
            return { id: item.id, valid: false };
          }
        });

        return reply.send({
          data: {
            count: results.length,
            validCount,
            allValid: validCount === results.length,
            results,
          },
        });
        /* c8 ignore next 3 -- defensive: batch verification handles internal errors */
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Batch verification");
      }
    },
  );

  // ISO 20022 Post-Quantum Dual-Signature Verification Endpoint
  app.post(
    "/v2/stream/iso20022",
    {
      schema: {
        tags: ["Wholesale Payments"],
        summary: "Verify ISO 20022 post-quantum dual-signature envelope",
        description:
          "Validates payment payload digests and dual classical + ML-DSA signatures for pacs.008 and pain.001.",
        body: {
          type: "object",
          required: ["envelope", "payload"],
          additionalProperties: false,
          properties: {
            envelope: {
              type: "object",
              required: [
                "messageId",
                "messageType",
                "payloadDigest",
                "digestAlgorithm",
                "timestamp",
                "classical",
                "postQuantum",
              ],
              additionalProperties: false,
              properties: {
                messageId: { type: "string" },
                messageType: {
                  type: "string",
                  enum: ["pacs.008", "pain.001", "camt.053", "generic"],
                },
                payloadDigest: { type: "string" },
                digestAlgorithm: {
                  type: "string",
                  enum: ["sha256", "sha384", "sha512"],
                },
                timestamp: { type: "string" },
                classical: {
                  type: "object",
                  required: ["algorithm", "signature", "publicKey"],
                  additionalProperties: false,
                  properties: {
                    algorithm: { type: "string" },
                    signature: { type: "string" },
                    publicKey: { type: "string" },
                  },
                },
                postQuantum: {
                  type: "object",
                  required: ["algorithm", "signature", "publicKey"],
                  additionalProperties: false,
                  properties: {
                    algorithm: {
                      type: "string",
                      enum: ["ml-dsa-44", "ml-dsa-65", "ml-dsa-87"],
                    },
                    signature: { type: "string" },
                    publicKey: { type: "string" },
                  },
                },
              },
            },
            payload: {},
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { envelope, payload } = request.body as {
          envelope: Iso20022DualSignatureEnvelope;
          payload: string | Record<string, unknown>;
        };

        const result = verifyIso20022Payment(envelope, payload);
        return reply.send({ data: result });
        /* c8 ignore next 8 -- defensive: ISO 20022 verification handles internal errors */
      } catch (error) {
        return classifyCryptoError(
          error,
          request,
          reply,
          "ISO 20022 verification",
        );
      }
    },
  );
};
