/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Post-quantum cryptography endpoints.
 *
 * Exposes ML-KEM-768 (FIPS 203) and hybrid X25519+ML-KEM key exchange.
 */

import type { FastifyInstance } from "fastify";
import {
  mlKemGenerateKeyPair,
  mlKemEncapsulate,
  mlKemDecapsulate,
  hybridGenerateKeyPair,
  hybridEncapsulate,
  hybridDecapsulate,
} from "@sebastienrousseau/crypto-lib/dist/modern";
import { rejectUnauthorized } from "../../utils/route-helpers";

/** Registers v2 post-quantum ML-KEM and hybrid key-exchange endpoints. */
export default (app: FastifyInstance): void => {
  // --- ML-KEM standalone ---

  app.post(
    "/v2/pq/keygen",
    {
      schema: {
        tags: ["Post-Quantum"],
        summary: "Generate ML-KEM-768 key pair",
        description:
          "Generate a NIST FIPS 203 ML-KEM-768 key pair for quantum-resistant key encapsulation.",
        body: { type: "object", additionalProperties: false, properties: {} },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const keyPair = mlKemGenerateKeyPair();
        return reply.send({ data: keyPair });
        /* c8 ignore next 4 -- defensive: mlKemGenerateKeyPair never throws */
      } catch (error) {
        request.log.error(error, "ML-KEM keygen failed");
        return reply.status(500).send({ error: "Key generation failed" });
      }
    },
  );

  app.post(
    "/v2/pq/encapsulate",
    {
      schema: {
        tags: ["Post-Quantum"],
        summary: "ML-KEM encapsulate",
        description:
          "Encapsulate a shared secret using an ML-KEM-768 public key.",
        body: {
          type: "object",
          required: ["publicKey"],
          additionalProperties: false,
          properties: {
            publicKey: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { publicKey } = request.body as { publicKey: string };
        const result = mlKemEncapsulate(publicKey);
        return reply.send({ data: result });
      } catch (error) {
        request.log.error(error, "ML-KEM encapsulate failed");
        return reply.status(500).send({ error: "Encapsulation failed" });
      }
    },
  );

  app.post(
    "/v2/pq/decapsulate",
    {
      schema: {
        tags: ["Post-Quantum"],
        summary: "ML-KEM decapsulate",
        description:
          "Decapsulate and recover the shared secret using the ML-KEM secret key.",
        body: {
          type: "object",
          required: ["secretKey", "ciphertext"],
          additionalProperties: false,
          properties: {
            secretKey: { type: "string", minLength: 1 },
            ciphertext: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { secretKey, ciphertext } = request.body as {
          secretKey: string;
          ciphertext: string;
        };
        const result = mlKemDecapsulate(secretKey, ciphertext);
        return reply.send({ data: result });
      } catch (error) {
        request.log.error(error, "ML-KEM decapsulate failed");
        return reply.status(500).send({ error: "Decapsulation failed" });
      }
    },
  );

  // --- Hybrid X25519 + ML-KEM-768 ---

  app.post(
    "/v2/pq/hybrid/keygen",
    {
      schema: {
        tags: ["Post-Quantum"],
        summary: "Generate hybrid X25519 + ML-KEM-768 key pair",
        description:
          "Generates both classical (X25519) and post-quantum (ML-KEM-768) key pairs for hybrid key exchange.",
        body: { type: "object", additionalProperties: false, properties: {} },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const keyPair = hybridGenerateKeyPair();
        return reply.send({ data: keyPair });
        /* c8 ignore next 4 -- defensive: hybridGenerateKeyPair never throws */
      } catch (error) {
        request.log.error(error, "Hybrid keygen failed");
        return reply.status(500).send({ error: "Key generation failed" });
      }
    },
  );

  app.post(
    "/v2/pq/hybrid/encapsulate",
    {
      schema: {
        tags: ["Post-Quantum"],
        summary: "Hybrid encapsulate (X25519 + ML-KEM-768)",
        description:
          "Performs X25519 ECDH + ML-KEM encapsulation, derives a combined shared secret via HKDF-SHA256.",
        body: {
          type: "object",
          required: ["x25519PublicKey", "mlKemPublicKey"],
          additionalProperties: false,
          properties: {
            x25519PublicKey: { type: "string", minLength: 64, maxLength: 64 },
            mlKemPublicKey: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const { x25519PublicKey, mlKemPublicKey } = request.body as {
          x25519PublicKey: string;
          mlKemPublicKey: string;
        };
        const result = hybridEncapsulate(x25519PublicKey, mlKemPublicKey);
        return reply.send({ data: result });
      } catch (error) {
        request.log.error(error, "Hybrid encapsulate failed");
        return reply.status(500).send({ error: "Hybrid encapsulation failed" });
      }
    },
  );

  app.post(
    "/v2/pq/hybrid/decapsulate",
    {
      schema: {
        tags: ["Post-Quantum"],
        summary: "Hybrid decapsulate (X25519 + ML-KEM-768)",
        description:
          "Recovers the combined shared secret using private keys and sender's ephemeral data.",
        body: {
          type: "object",
          required: [
            "x25519PrivateKey",
            "mlKemSecretKey",
            "x25519EphemeralPublic",
            "mlKemCiphertext",
          ],
          additionalProperties: false,
          properties: {
            x25519PrivateKey: { type: "string", minLength: 64, maxLength: 64 },
            mlKemSecretKey: { type: "string", minLength: 1 },
            x25519EphemeralPublic: {
              type: "string",
              minLength: 64,
              maxLength: 64,
            },
            mlKemCiphertext: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;
        const body = request.body as {
          x25519PrivateKey: string;
          mlKemSecretKey: string;
          x25519EphemeralPublic: string;
          mlKemCiphertext: string;
        };
        const result = hybridDecapsulate(
          body.x25519PrivateKey,
          body.mlKemSecretKey,
          body.x25519EphemeralPublic,
          body.mlKemCiphertext,
        );
        return reply.send({ data: result });
      } catch (error) {
        request.log.error(error, "Hybrid decapsulate failed");
        return reply.status(500).send({ error: "Hybrid decapsulation failed" });
      }
    },
  );
};
