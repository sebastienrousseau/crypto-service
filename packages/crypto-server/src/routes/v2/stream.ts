// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import type { FastifyInstance, FastifyRequest } from "fastify";
import { ed25519Sign, ed25519Verify } from "@sebastienrousseau/crypto-lib";
import {
  verifyIso20022Payment,
  type Iso20022DualSignatureEnvelope,
} from "@sebastienrousseau/crypto-lib/dist/protocols/iso20022";
import { classifyCryptoError } from "../../utils/route-helpers";
import { KEY_ID_SCHEMA, resolveKey } from "../../utils/keys";
import type { StoredKey } from "../../lib/key-store";

interface StreamSignItem {
  id: string;
  message: string;
  keyId: string;
}

interface StreamVerifyItem {
  id: string;
  message: string;
  signature: string;
  publicKey: string;
}

/** Request schema for `POST /v2/stream/sign`. */
const SIGN_SCHEMA = {
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
          required: ["id", "message", "keyId"],
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            message: { type: "string", minLength: 1 },
            keyId: KEY_ID_SCHEMA,
          },
        },
      },
    },
  },
};

/** Request schema for `POST /v2/stream/verify`. */
const VERIFY_SCHEMA = {
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
};

/** Request schema for `POST /v2/stream/iso20022`. */
const ISO20022_SCHEMA = {
  tags: ["Wholesale Payments"],
  summary: "Verify ISO 20022 post-quantum dual-signature envelope",
  description:
    "Validates the payload digest and both the Ed25519 and ML-DSA signatures of a pacs.008, pain.001 or camt.053 envelope. Signatures are checked against trustedKeys, the signer's public keys from the caller's own registry; the public keys inside the envelope are ignored.",
  body: {
    type: "object",
    required: ["envelope", "payload", "trustedKeys"],
    additionalProperties: false,
    properties: {
      trustedKeys: {
        type: "object",
        required: ["classicalPublicKey", "postQuantumPublicKey"],
        additionalProperties: false,
        properties: {
          classicalPublicKey: { type: "string", minLength: 1 },
          postQuantumPublicKey: { type: "string", minLength: 1 },
        },
      },
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
};

/**
 * Resolve every distinct `keyId` in a batch once, as server-held ed25519
 * keys of the requesting principal. Throws on the first unknown key.
 */
async function resolveBatchKeys(
  request: FastifyRequest,
  items: readonly StreamSignItem[],
): Promise<Map<string, StoredKey>> {
  const keys = new Map<string, StoredKey>();
  for (const keyId of new Set(items.map((i) => i.keyId))) {
    keys.set(keyId, await resolveKey(request, keyId, ["ed25519"]));
  }
  return keys;
}

/** Batch/streaming signing pipeline. */
function registerBatchSign(app: FastifyInstance): void {
  app.post(
    "/v2/stream/sign",
    { schema: SIGN_SCHEMA },
    async (request, reply) => {
      const { items } = request.body as { items: StreamSignItem[] };
      const keys = await resolveBatchKeys(request, items);

      // Stored ed25519 keys always sign; anything else is a server error.
      const signatures = items.map((item) => {
        const key = keys.get(item.keyId) as StoredKey;
        const res = ed25519Sign(key.privateParts["privateKey"], item.message);
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
    },
  );
}

/** Batch/streaming signature verification pipeline. */
function registerBatchVerify(app: FastifyInstance): void {
  app.post(
    "/v2/stream/verify",
    { schema: VERIFY_SCHEMA },
    async (request, reply) => {
      try {
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
}

/** ISO 20022 post-quantum dual-signature verification endpoint. */
function registerIso20022Verify(app: FastifyInstance): void {
  app.post(
    "/v2/stream/iso20022",
    { schema: ISO20022_SCHEMA },
    async (request, reply) => {
      try {
        const { envelope, payload, trustedKeys } = request.body as {
          envelope: Iso20022DualSignatureEnvelope;
          payload: string | Record<string, unknown>;
          trustedKeys: {
            classicalPublicKey: string;
            postQuantumPublicKey: string;
          };
        };

        const result = verifyIso20022Payment(envelope, payload, {
          classicalPublicKeyHex: trustedKeys.classicalPublicKey,
          postQuantumPublicKeyHex: trustedKeys.postQuantumPublicKey,
        });
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
}

/** Registers high-throughput streaming and batch cryptographic pipeline endpoints. */
export default (app: FastifyInstance): void => {
  registerBatchSign(app);
  registerBatchVerify(app);
  registerIso20022Verify(app);
};
