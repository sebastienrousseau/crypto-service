/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  KmsError,
  type KmsErrorCode,
  type KmsProvider,
} from "@sebastienrousseau/crypto-kms";
import { classifyCryptoError } from "../../utils/route-helpers";
import { hasScope, type AuthPayload } from "../../lib/auth";
import { sendProblem, type ProblemSlug } from "../../lib/problem";
import {
  KmsProviderNotEnabledError,
  type KmsRegistry,
} from "../../lib/kms-providers";
import type { KmsOwners } from "../../lib/kms-owners";
import { noteAuditKey } from "../../lib/audit";

declare module "fastify" {
  interface FastifyInstance {
    /** KMS providers enabled by KMS_PROVIDERS (see lib/kms-providers.ts). */
    kms: KmsRegistry;
    /** Owner of each KMS key created through the API (lib/kms-owners.ts). */
    kmsOwners: KmsOwners;
  }
}

/** Raised when the requesting principal may not use a KMS key. */
class KmsKeyNotOwnedError extends Error {
  override readonly name = "KmsKeyNotOwnedError";
}

/** HTTP status and problem type for each crypto-kms error code. */
const KMS_PROBLEMS: Readonly<Record<KmsErrorCode, [number, ProblemSlug]>> = {
  NOT_FOUND: [404, "kms-key-not-found"],
  DISABLED: [409, "kms-key-disabled"],
  INVALID_USAGE: [400, "invalid-input"],
  INVALID_ARGUMENT: [400, "invalid-input"],
  INVALID_CIPHERTEXT: [400, "invalid-input"],
  DECRYPTION_FAILED: [400, "invalid-input"],
  VERSION_DESTROYED: [400, "invalid-input"],
  NOT_IMPLEMENTED: [501, "not-implemented"],
  DEPENDENCY_MISSING: [503, "service-unavailable"],
};

/**
 * Answer a failed KMS operation: a disabled provider is a 400, another
 * principal's key is a 404 indistinguishable from a missing one, and a
 * crypto-kms error maps by its code. Provider messages are logged, not
 * returned, as they can describe the backend.
 */
function kmsFailure(
  err: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
  operation: string,
): FastifyReply {
  if (err instanceof KmsProviderNotEnabledError) {
    return sendProblem(reply, 400, "kms-provider-not-enabled", err.message);
  }
  if (err instanceof KmsKeyNotOwnedError) {
    return sendProblem(reply, 404, "kms-key-not-found", "Unknown KMS key");
  }
  if (err instanceof KmsError) {
    const [status, slug] = KMS_PROBLEMS[err.code];
    request.log.warn(err, `${operation} failed`);
    return sendProblem(reply, status, slug, `${operation} failed`, {
      code: err.code,
    });
  }
  return classifyCryptoError(err, request, reply, operation);
}

/** The authenticated principal (set by the server-wide auth hook). */
const authOf = (request: FastifyRequest): AuthPayload =>
  (request as unknown as { auth: AuthPayload }).auth;

/** The enabled provider a request names (default `local`). */
function providerFor(
  request: FastifyRequest,
  b: Record<string, unknown>,
): { name: string; provider: KmsProvider } {
  const name = ((b["provider"] as string | undefined) ?? "local").toLowerCase();
  return { name, provider: request.server.kms.get(name) };
}

/**
 * The provider and key a request names, if the principal may use it: its
 * owner, or `crypto:admin` for a key the API did not create.
 */
function ownedKey(
  request: FastifyRequest,
  b: Record<string, unknown>,
): { provider: KmsProvider; keyId: string } {
  const { name, provider } = providerFor(request, b);
  const keyId = sanitizeKeyId(b["keyId"]);
  const auth = authOf(request);
  const owner = request.server.kmsOwners.ownerOf(name, keyId);
  const allowed =
    owner === undefined ? hasScope(auth, "crypto:admin") : owner === auth.sub;
  if (!allowed) throw new KmsKeyNotOwnedError();
  return { provider, keyId };
}

function parseBytes(text: string): Uint8Array {
  const isHex = /^[0-9a-fA-F]*$/.test(text) && text.length % 2 === 0;
  return isHex
    ? new Uint8Array(Buffer.from(text, "hex"))
    : new Uint8Array(Buffer.from(text, "utf8"));
}

function sanitizeKeyId(id: unknown): string {
  if (
    typeof id !== "string" ||
    !/^[a-zA-Z0-9_\-/:.]+$/.test(id) ||
    id.includes("..")
  ) {
    throw new KmsError("INVALID_ARGUMENT", "Invalid keyId format");
  }
  return encodeURIComponent(id).replace(/%2F/g, "/").replace(/%3A/g, ":");
}

const CREATE_KEY_SCHEMA = {
  tags: ["KMS"],
  summary: "Create a managed key in the designated KMS provider",
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      provider: { type: "string" },
      algorithm: { type: "string" },
      usage: { type: "string", enum: ["encrypt", "sign", "wrap"] },
      metadata: { type: "object", additionalProperties: { type: "string" } },
    },
  },
};

const WRAP_SCHEMA = {
  tags: ["KMS"],
  summary: "Wrap an existing key using a managed KMS key",
  body: {
    type: "object",
    required: ["keyId", "unwrappedKey"],
    additionalProperties: false,
    properties: {
      keyId: { type: "string" },
      unwrappedKey: { type: "string" },
      provider: { type: "string" },
      context: { type: "object", additionalProperties: { type: "string" } },
    },
  },
};

const UNWRAP_SCHEMA = {
  tags: ["KMS"],
  summary: "Unwrap a wrapped key using a managed KMS key",
  body: {
    type: "object",
    required: ["keyId", "wrappedKey"],
    additionalProperties: false,
    properties: {
      keyId: { type: "string" },
      wrappedKey: { type: "string" },
      provider: { type: "string" },
      context: { type: "object", additionalProperties: { type: "string" } },
    },
  },
};

const DATA_KEY_SCHEMA = {
  tags: ["KMS"],
  summary: "Generate a Data Encryption Key (DEK) via KMS provider",
  body: {
    type: "object",
    required: ["keyId"],
    additionalProperties: false,
    properties: {
      keyId: { type: "string" },
      provider: { type: "string" },
      keySpec: { type: "string" },
    },
  },
};

const ENCRYPT_SCHEMA = {
  tags: ["KMS"],
  summary: "Encrypt plaintext with a managed KMS key",
  body: {
    type: "object",
    required: ["keyId", "plaintext"],
    additionalProperties: false,
    properties: {
      keyId: { type: "string" },
      plaintext: { type: "string" },
      provider: { type: "string" },
      context: { type: "object", additionalProperties: { type: "string" } },
    },
  },
};

const DECRYPT_SCHEMA = {
  tags: ["KMS"],
  summary: "Decrypt ciphertext with a managed KMS key",
  body: {
    type: "object",
    required: ["keyId", "ciphertext"],
    additionalProperties: false,
    properties: {
      keyId: { type: "string" },
      ciphertext: { type: "string" },
      provider: { type: "string" },
      context: { type: "object", additionalProperties: { type: "string" } },
    },
  },
};

function registerCreateKey(app: FastifyInstance): void {
  app.post(
    "/v2/kms/create-key",
    {
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
      schema: CREATE_KEY_SCHEMA,
    },
    async (request, reply) => {
      const b = request.body as Record<string, unknown>;
      try {
        const { name, provider } = providerFor(request, b);
        const meta = await provider.createKey(
          (b["algorithm"] as string) ?? "aes-256-gcm",
          (b["usage"] as "encrypt" | "sign" | "wrap") ?? "encrypt",
          b["metadata"] as Record<string, string>,
        );
        request.server.kmsOwners.bind(name, meta.keyId, authOf(request).sub);
        noteAuditKey(request, meta.keyId);
        return reply.send({ data: meta });
      } catch (err) {
        return kmsFailure(err, request, reply, "KMS CreateKey");
      }
    },
  );
}

function registerWrap(app: FastifyInstance): void {
  app.post(
    "/v2/kms/wrap",
    {
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
      schema: WRAP_SCHEMA,
    },
    async (request, reply) => {
      const b = request.body as Record<string, unknown>;
      try {
        const { provider, keyId } = ownedKey(request, b);
        if (!provider.wrapKey) {
          throw new KmsError("NOT_IMPLEMENTED", "wrapKey is not supported");
        }
        const bytes = parseBytes(b["unwrappedKey"] as string);
        const res = await provider.wrapKey(
          keyId,
          bytes,
          b["context"] as Record<string, string>,
        );
        return reply.send({
          data: { ...res, provider: provider.name },
        });
      } catch (err) {
        return kmsFailure(err, request, reply, "KMS Wrap");
      }
    },
  );
}

function registerUnwrap(app: FastifyInstance): void {
  app.post(
    "/v2/kms/unwrap",
    {
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
      schema: UNWRAP_SCHEMA,
    },
    async (request, reply) => {
      const b = request.body as Record<string, unknown>;
      try {
        const { provider, keyId } = ownedKey(request, b);
        if (!provider.unwrapKey) {
          throw new KmsError("NOT_IMPLEMENTED", "unwrapKey is not supported");
        }
        const res = await provider.unwrapKey(
          keyId,
          b["wrappedKey"] as string,
          b["context"] as Record<string, string>,
        );
        return reply.send({
          data: {
            unwrappedKey: Buffer.from(res.unwrappedKey).toString("hex"),
            keyId: res.keyId,
            provider: provider.name,
          },
        });
      } catch (err) {
        return kmsFailure(err, request, reply, "KMS Unwrap");
      }
    },
  );
}

function registerDataKey(app: FastifyInstance): void {
  app.post(
    "/v2/kms/generate-data-key",
    {
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
      schema: DATA_KEY_SCHEMA,
    },
    async (request, reply) => {
      const b = request.body as Record<string, unknown>;
      try {
        const { provider, keyId } = ownedKey(request, b);
        const res = await provider.generateDataKey(
          keyId,
          b["keySpec"] as string,
        );
        return reply.send({
          data: {
            plaintext: Buffer.from(res.plaintext).toString("hex"),
            ciphertext: res.ciphertext,
            keyId,
            provider: provider.name,
          },
        });
      } catch (err) {
        return kmsFailure(err, request, reply, "KMS GenerateDataKey");
      }
    },
  );
}

function registerEncrypt(app: FastifyInstance): void {
  app.post(
    "/v2/kms/encrypt",
    {
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
      schema: ENCRYPT_SCHEMA,
    },
    async (request, reply) => {
      const b = request.body as Record<string, unknown>;
      try {
        const { provider, keyId } = ownedKey(request, b);
        const bytes = parseBytes(b["plaintext"] as string);
        const res = await provider.encrypt(
          keyId,
          bytes,
          b["context"] as Record<string, string>,
        );
        return reply.send({
          data: { ...res, provider: provider.name },
        });
      } catch (err) {
        return kmsFailure(err, request, reply, "KMS Encrypt");
      }
    },
  );
}

function registerDecrypt(app: FastifyInstance): void {
  app.post(
    "/v2/kms/decrypt",
    {
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
      schema: DECRYPT_SCHEMA,
    },
    async (request, reply) => {
      const b = request.body as Record<string, unknown>;
      try {
        const { provider, keyId } = ownedKey(request, b);
        const res = await provider.decrypt(
          keyId,
          b["ciphertext"] as string,
          b["context"] as Record<string, string>,
        );
        const utf8 = Buffer.from(res.plaintext).toString("utf8");
        const hex = Buffer.from(res.plaintext).toString("hex");
        return reply.send({
          data: {
            plaintext: utf8,
            hex,
            keyId: res.keyId,
            provider: provider.name,
          },
        });
      } catch (err) {
        return kmsFailure(err, request, reply, "KMS Decrypt");
      }
    },
  );
}

/** Registers all KMS routes on the Fastify instance. */
export default function kmsRoute(app: FastifyInstance): void {
  registerCreateKey(app);
  registerWrap(app);
  registerUnwrap(app);
  registerDataKey(app);
  registerEncrypt(app);
  registerDecrypt(app);
}
