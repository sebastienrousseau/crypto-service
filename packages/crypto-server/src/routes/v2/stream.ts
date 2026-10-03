// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  ed25519Sign,
  ed25519Verify,
  wipeMemory,
} from "@sebastienrousseau/crypto-lib";
import {
  streamPqEncrypt,
  streamPqDecrypt,
  streamMultiPqEncrypt,
  streamMultiPqDecrypt,
} from "@sebastienrousseau/crypto-lib/streaming";
import {
  verifyIso20022Payment,
  type Iso20022DualSignatureEnvelope,
} from "@sebastienrousseau/crypto-lib/protocols";
import { classifyCryptoError } from "../../utils/route-helpers";
import { resolveKey } from "../../utils/keys";
import type { StoredKey } from "../../lib/key-store";
import {
  SIGN_SCHEMA,
  VERIFY_SCHEMA,
  ISO20022_SCHEMA,
  STREAM_PQ_ENCRYPT_SCHEMA,
  STREAM_PQ_DECRYPT_SCHEMA,
  STREAM_MULTI_PQ_ENCRYPT_SCHEMA,
  STREAM_MULTI_PQ_DECRYPT_SCHEMA,
} from "./stream-schemas";

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
    {
      schema: VERIFY_SCHEMA,
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
    },
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
    {
      schema: ISO20022_SCHEMA,
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
    },
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

/** Hybrid post-quantum stream encryption endpoint. */
function registerStreamPqEncrypt(app: FastifyInstance): void {
  app.post(
    "/v2/stream/pq-encrypt",
    { schema: STREAM_PQ_ENCRYPT_SCHEMA },
    async (request, reply) => {
      try {
        const { x25519PublicKey, mlKemPublicKey, plaintext, chunkSize } =
          request.body as {
            x25519PublicKey: string;
            mlKemPublicKey: string;
            plaintext: string;
            chunkSize?: number;
          };
        const ptBytes = Buffer.from(plaintext, "utf8");
        const res = streamPqEncrypt({
          recipientX25519Public: x25519PublicKey,
          recipientMlKemPublic: mlKemPublicKey,
          plaintext: ptBytes,
          ...(chunkSize !== undefined ? { chunkSize } : {}),
        });
        return reply.send({
          data: {
            ciphertext: Buffer.from(res.ciphertext).toString("base64"),
            algorithm: res.algorithm,
          },
        });
      } catch (error) {
        return classifyCryptoError(
          error,
          request,
          reply,
          "PQ stream encryption",
        );
      }
    },
  );
}

/** Hybrid post-quantum stream decryption endpoint. */
function registerStreamPqDecrypt(app: FastifyInstance): void {
  app.post(
    "/v2/stream/pq-decrypt",
    { schema: STREAM_PQ_DECRYPT_SCHEMA },
    async (request, reply) => {
      const { keyId, ciphertext, chunkSize } = request.body as {
        keyId: string;
        ciphertext: string;
        chunkSize?: number;
      };
      const key = await resolveKey(request, keyId, ["x25519-ml-kem-768"]);
      try {
        const ctBytes = Buffer.from(ciphertext, "base64");
        const decrypted = streamPqDecrypt({
          recipientX25519Secret: key.privateParts["x25519PrivateKey"],
          recipientMlKemSecret: key.privateParts["mlKemSecretKey"],
          ciphertext: ctBytes,
          ...(chunkSize !== undefined ? { chunkSize } : {}),
        });
        const plaintext = Buffer.from(decrypted).toString("utf8");
        wipeMemory(decrypted);
        return reply.send({ data: { plaintext } });
      } catch (error) {
        return classifyCryptoError(
          error,
          request,
          reply,
          "PQ stream decryption",
        );
      }
    },
  );
}

/** Multi-recipient hybrid post-quantum stream encryption endpoint. */
function registerStreamMultiPqEncrypt(app: FastifyInstance): void {
  app.post(
    "/v2/stream/multi-pq-encrypt",
    { schema: STREAM_MULTI_PQ_ENCRYPT_SCHEMA },
    async (request, reply) => {
      try {
        const { recipients, plaintext, chunkSize } = request.body as {
          recipients: Array<{
            recipientId: string;
            x25519PublicKey: string;
            mlKemPublicKey: string;
          }>;
          plaintext: string;
          chunkSize?: number;
        };
        const ptBytes = Buffer.from(plaintext, "utf8");
        const res = streamMultiPqEncrypt({
          recipients: recipients.map((r) => ({
            recipientId: r.recipientId,
            recipientX25519Public: r.x25519PublicKey,
            recipientMlKemPublic: r.mlKemPublicKey,
          })),
          plaintext: ptBytes,
          ...(chunkSize !== undefined ? { chunkSize } : {}),
        });
        wipeMemory(ptBytes);
        return reply.send({
          data: {
            ciphertext: Buffer.from(res.ciphertext).toString("base64"),
            algorithm: res.algorithm,
            recipientCount: res.recipientCount,
          },
        });
      } catch (error) {
        return classifyCryptoError(
          error,
          request,
          reply,
          "Multi-PQ stream encryption",
        );
      }
    },
  );
}

/** Multi-recipient hybrid post-quantum stream decryption endpoint. */
function registerStreamMultiPqDecrypt(app: FastifyInstance): void {
  app.post(
    "/v2/stream/multi-pq-decrypt",
    {
      schema: STREAM_MULTI_PQ_DECRYPT_SCHEMA,
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { keyId, recipientId, ciphertext, chunkSize } = request.body as {
        keyId: string;
        recipientId?: string;
        ciphertext: string;
        chunkSize?: number;
      };
      const key = await resolveKey(request, keyId, ["x25519-ml-kem-768"]);
      try {
        const ctBytes = Buffer.from(ciphertext, "base64");
        const decrypted = streamMultiPqDecrypt({
          ...(recipientId !== undefined ? { recipientId } : {}),
          recipientX25519Secret: key.privateParts["x25519PrivateKey"],
          recipientMlKemSecret: key.privateParts["mlKemSecretKey"],
          ciphertext: ctBytes,
          ...(chunkSize !== undefined ? { chunkSize } : {}),
        });
        const plaintext = Buffer.from(decrypted.plaintext).toString("utf8");
        wipeMemory(decrypted.plaintext);
        return reply.send({
          data: {
            plaintext,
            recipientId: decrypted.recipientId,
          },
        });
      } catch (error) {
        return classifyCryptoError(
          error,
          request,
          reply,
          "Multi-PQ stream decryption",
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
  registerStreamPqEncrypt(app);
  registerStreamPqDecrypt(app);
  registerStreamMultiPqEncrypt(app);
  registerStreamMultiPqDecrypt(app);
};
