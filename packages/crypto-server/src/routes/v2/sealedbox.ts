/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { classifyCryptoError } from "../../utils/route-helpers";
import { KEY_ID_SCHEMA, resolveKey } from "../../utils/keys";

/** crypto-lib sealed-box API, loaded on first use. */
const loadSealedbox = async () =>
  (await import("@sebastienrousseau/crypto-lib/high-level")).sealedbox;

/** `POST /v2/sealedbox/seal`: anonymous encryption to an X25519 public key. */
function registerSeal(app: FastifyInstance): void {
  app.post(
    "/v2/sealedbox/seal",
    {
      schema: {
        tags: ["Sealed Box"],
        summary: "Anonymous public-key encryption (X25519 sealed box)",
        body: {
          type: "object",
          required: ["recipientPublicKey", "plaintext"],
          additionalProperties: false,
          properties: {
            recipientPublicKey: { type: "string", minLength: 1 },
            plaintext: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { seal } = await loadSealedbox();
        const { recipientPublicKey, plaintext } = request.body as {
          recipientPublicKey: string;
          plaintext: string;
        };
        return reply.send({ data: seal(recipientPublicKey, plaintext) });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Encryption");
      }
    },
  );
}

/** `POST /v2/sealedbox/open`: open a sealed box with a server-held X25519 key. */
function registerOpen(app: FastifyInstance): void {
  app.post(
    "/v2/sealedbox/open",
    {
      schema: {
        tags: ["Sealed Box"],
        summary: "Decrypt an anonymous sealed box (X25519)",
        description:
          "Opens a sealed box with a server-held x25519 key (keyId from POST /v2/keys/generate).",
        body: {
          type: "object",
          required: ["keyId", "sealed"],
          additionalProperties: false,
          properties: {
            keyId: KEY_ID_SCHEMA,
            sealed: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { keyId, sealed } = request.body as {
        keyId: string;
        sealed: string;
      };
      const key = await resolveKey(request, keyId, ["x25519"]);
      try {
        const { open } = await loadSealedbox();
        const plaintext = open(key.privateParts["privateKey"], sealed);
        return reply.send({
          data: Buffer.from(plaintext).toString("utf8"),
        });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Decryption");
      }
    },
  );
}

/** `POST /v2/sealedbox/seal-pq`: hybrid X25519 + ML-KEM-768 sealed box. */
function registerSealPq(app: FastifyInstance): void {
  app.post(
    "/v2/sealedbox/seal-pq",
    {
      schema: {
        tags: ["Sealed Box"],
        summary:
          "Post-quantum anonymous encryption (X25519 + ML-KEM-768 sealed box)",
        body: {
          type: "object",
          required: ["x25519PublicKey", "mlKemPublicKey", "plaintext"],
          additionalProperties: false,
          properties: {
            x25519PublicKey: { type: "string", minLength: 1 },
            mlKemPublicKey: { type: "string", minLength: 1 },
            plaintext: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { sealPQ } = await loadSealedbox();
        const { x25519PublicKey, mlKemPublicKey, plaintext } = request.body as {
          x25519PublicKey: string;
          mlKemPublicKey: string;
          plaintext: string;
        };
        return reply.send({
          data: sealPQ(x25519PublicKey, mlKemPublicKey, plaintext),
        });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Encryption");
      }
    },
  );
}

/** `POST /v2/sealedbox/open-pq`: open a hybrid sealed box with a server-held key. */
function registerOpenPq(app: FastifyInstance): void {
  app.post(
    "/v2/sealedbox/open-pq",
    {
      schema: {
        tags: ["Sealed Box"],
        summary: "Decrypt a post-quantum sealed box (X25519 + ML-KEM-768)",
        description:
          "Opens a hybrid sealed box with a server-held x25519-ml-kem-768 key (keyId from POST /v2/pq/hybrid/keygen).",
        body: {
          type: "object",
          required: ["keyId", "sealed"],
          additionalProperties: false,
          properties: {
            keyId: KEY_ID_SCHEMA,
            sealed: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { keyId, sealed } = request.body as {
        keyId: string;
        sealed: string;
      };
      const key = await resolveKey(request, keyId, ["x25519-ml-kem-768"]);
      try {
        const { openPQ } = await loadSealedbox();
        const { x25519PrivateKey, mlKemSecretKey } = key.privateParts;
        const plaintext = openPQ(x25519PrivateKey, mlKemSecretKey, sealed);
        return reply.send({
          data: Buffer.from(plaintext).toString("utf8"),
        });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Decryption");
      }
    },
  );
}

/** Registers v2 sealed-box (anonymous public-key) encryption endpoints. */
export default (app: FastifyInstance): void => {
  registerSeal(app);
  registerOpen(app);
  registerSealPq(app);
  registerOpenPq(app);
};
