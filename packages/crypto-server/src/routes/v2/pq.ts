/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Post-quantum cryptography endpoints.
 *
 * Exposes ML-KEM-768 (FIPS 203) and hybrid X25519+ML-KEM key exchange.
 * Key generation keeps the secret keys on the server and returns a
 * `keyId`; decapsulation takes that `keyId`.
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
import { classifyCryptoError } from "../../utils/route-helpers";
import {
  KEY_ID_SCHEMA,
  publicView,
  resolveKey,
  storeKey,
} from "../../utils/keys";

/** Request body schema of the parameterless key-generation routes. */
const EMPTY_BODY = {
  type: "object",
  additionalProperties: false,
  properties: {},
} as const;

/** `POST /v2/pq/keygen`: generate and store an ML-KEM-768 key pair. */
function registerMlKemKeygen(app: FastifyInstance): void {
  app.post(
    "/v2/pq/keygen",
    {
      schema: {
        tags: ["Post-Quantum"],
        summary: "Generate a server-held ML-KEM-768 key pair",
        description:
          "Generates a NIST FIPS 203 ML-KEM-768 key pair, keeps the secret key on the server and returns its keyId with the public key.",
        body: EMPTY_BODY,
      },
    },
    async (request, reply) => {
      const { publicKey, secretKey, algorithm } = mlKemGenerateKeyPair();
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

/** `POST /v2/pq/encapsulate`: ML-KEM-768 encapsulation to a public key. */
function registerMlKemEncapsulate(app: FastifyInstance): void {
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
        const { publicKey } = request.body as { publicKey: string };
        const result = mlKemEncapsulate(publicKey);
        return reply.send({ data: result });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Encapsulation");
      }
    },
  );
}

/** `POST /v2/pq/decapsulate`: ML-KEM-768 decapsulation with a server-held key. */
function registerMlKemDecapsulate(app: FastifyInstance): void {
  app.post(
    "/v2/pq/decapsulate",
    {
      schema: {
        tags: ["Post-Quantum"],
        summary: "ML-KEM decapsulate",
        description:
          "Recover the shared secret with a server-held ML-KEM-768 key (keyId from POST /v2/pq/keygen or POST /v2/keys/generate).",
        body: {
          type: "object",
          required: ["keyId", "ciphertext"],
          additionalProperties: false,
          properties: {
            keyId: KEY_ID_SCHEMA,
            ciphertext: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { keyId, ciphertext } = request.body as {
        keyId: string;
        ciphertext: string;
      };
      const key = await resolveKey(request, keyId, ["ml-kem-768"]);
      try {
        const result = mlKemDecapsulate(
          key.privateParts["secretKey"],
          ciphertext,
        );
        return reply.send({ data: result });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Decapsulation");
      }
    },
  );
}

/** `POST /v2/pq/hybrid/keygen`: generate and store a hybrid key pair. */
function registerHybridKeygen(app: FastifyInstance): void {
  app.post(
    "/v2/pq/hybrid/keygen",
    {
      schema: {
        tags: ["Post-Quantum"],
        summary: "Generate a server-held hybrid X25519 + ML-KEM-768 key pair",
        description:
          "Generates classical (X25519) and post-quantum (ML-KEM-768) key pairs for hybrid key exchange, keeps the private keys on the server and returns a keyId with the public keys.",
        body: EMPTY_BODY,
      },
    },
    async (request, reply) => {
      const kp = hybridGenerateKeyPair();
      const stored = await storeKey(
        request,
        kp.algorithm,
        {
          x25519PublicKey: kp.x25519PublicKey,
          mlKemPublicKey: kp.mlKemPublicKey,
        },
        {
          x25519PrivateKey: kp.x25519PrivateKey,
          mlKemSecretKey: kp.mlKemSecretKey,
        },
      );
      return reply.send({ data: publicView(stored) });
    },
  );
}

/** `POST /v2/pq/hybrid/encapsulate`: hybrid encapsulation to public keys. */
function registerHybridEncapsulate(app: FastifyInstance): void {
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
        const { x25519PublicKey, mlKemPublicKey } = request.body as {
          x25519PublicKey: string;
          mlKemPublicKey: string;
        };
        const result = hybridEncapsulate(x25519PublicKey, mlKemPublicKey);
        return reply.send({ data: result });
      } catch (error) {
        return classifyCryptoError(
          error,
          request,
          reply,
          "Hybrid encapsulation",
        );
      }
    },
  );
}

/** `POST /v2/pq/hybrid/decapsulate`: hybrid decapsulation with a server-held key. */
function registerHybridDecapsulate(app: FastifyInstance): void {
  app.post(
    "/v2/pq/hybrid/decapsulate",
    {
      schema: {
        tags: ["Post-Quantum"],
        summary: "Hybrid decapsulate (X25519 + ML-KEM-768)",
        description:
          "Recovers the combined shared secret with a server-held x25519-ml-kem-768 key (keyId from POST /v2/pq/hybrid/keygen) and the sender's ephemeral data.",
        body: {
          type: "object",
          required: ["keyId", "x25519EphemeralPublic", "mlKemCiphertext"],
          additionalProperties: false,
          properties: {
            keyId: KEY_ID_SCHEMA,
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
      const body = request.body as {
        keyId: string;
        x25519EphemeralPublic: string;
        mlKemCiphertext: string;
      };
      const key = await resolveKey(request, body.keyId, ["x25519-ml-kem-768"]);
      try {
        const { x25519PrivateKey, mlKemSecretKey } = key.privateParts;
        const result = hybridDecapsulate(
          x25519PrivateKey,
          mlKemSecretKey,
          body.x25519EphemeralPublic,
          body.mlKemCiphertext,
        );
        return reply.send({ data: result });
      } catch (error) {
        return classifyCryptoError(
          error,
          request,
          reply,
          "Hybrid decapsulation",
        );
      }
    },
  );
}

/** Registers v2 post-quantum ML-KEM and hybrid key-exchange endpoints. */
export default (app: FastifyInstance): void => {
  // --- ML-KEM standalone ---
  registerMlKemKeygen(app);
  registerMlKemEncapsulate(app);
  registerMlKemDecapsulate(app);

  // --- Hybrid X25519 + ML-KEM-768 ---
  registerHybridKeygen(app);
  registerHybridEncapsulate(app);
  registerHybridDecapsulate(app);
};
