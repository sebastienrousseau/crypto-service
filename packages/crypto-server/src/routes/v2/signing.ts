/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import {
  ed25519Sign,
  ed25519Verify,
} from "@sebastienrousseau/crypto-lib/dist/modern";
import {
  rejectUnauthorized,
  classifyCryptoError,
} from "../../utils/route-helpers";

/** Registers v2 digital signature (sign/verify) endpoints. */
export default (app: FastifyInstance): void => {
  // Key generation moved to keys.ts (supports all algorithms)

  app.post(
    "/v2/sign",
    {
      schema: {
        tags: ["Signing"],
        summary: "Sign with Ed25519",
        description: "Create an Ed25519 digital signature over a message.",
        body: {
          type: "object",
          required: ["privateKey", "message"],
          additionalProperties: false,
          properties: {
            privateKey: { type: "string", minLength: 64, maxLength: 64 },
            message: {
              type: "string",
              minLength: 1,
              maxLength: 10 * 1024 * 1024,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { privateKey, message } = request.body as {
          privateKey: string;
          message: string;
        };
        const result = ed25519Sign(privateKey, message);
        return reply.send({ data: result });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Signing");
      }
    },
  );

  app.post(
    "/v2/verify",
    {
      schema: {
        tags: ["Signing"],
        summary: "Verify an Ed25519 signature",
        description:
          "Verify a digital signature against a message and public key.",
        body: {
          type: "object",
          required: ["publicKey", "message", "signature"],
          additionalProperties: false,
          properties: {
            publicKey: { type: "string", minLength: 64, maxLength: 64 },
            message: {
              type: "string",
              minLength: 1,
              maxLength: 10 * 1024 * 1024,
            },
            signature: { type: "string", minLength: 128, maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { publicKey, message, signature } = request.body as {
          publicKey: string;
          message: string;
          signature: string;
        };
        const result = ed25519Verify(publicKey, message, signature);
        return reply.send({ data: result });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Verification");
      }
    },
  );
};
