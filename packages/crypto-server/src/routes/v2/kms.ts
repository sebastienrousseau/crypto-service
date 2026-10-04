/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import {
  type KmsProvider,
  LocalKmsProvider,
  AwsKmsProvider,
  GcpKmsProvider,
  VaultKmsProvider,
  AzureKmsProvider,
} from "@sebastienrousseau/crypto-kms";
import { classifyCryptoError } from "../../utils/route-helpers";

const providerRegistry = new Map<string, KmsProvider>();
providerRegistry.set("local", new LocalKmsProvider());

/** Register or replace a KMS provider for route handling. */
export function registerKmsProvider(name: string, provider: KmsProvider): void {
  providerRegistry.set(name.toLowerCase(), provider);
}

/** Clear all registered providers back to defaults. */
export function resetKmsProviders(): void {
  providerRegistry.clear();
  providerRegistry.set("local", new LocalKmsProvider());
}

const DEFAULT_FACTORIES = new Map<string, () => KmsProvider>([
  [
    "aws",
    () =>
      new AwsKmsProvider({
        region: process.env["AWS_REGION"] ?? "us-east-1",
      }),
  ],
  [
    "gcp",
    () =>
      new GcpKmsProvider({
        projectId: process.env["GCP_PROJECT_ID"] ?? "test-project",
        locationId: process.env["GCP_LOCATION_ID"] ?? "global",
        keyRingId: process.env["GCP_KEY_RING_ID"] ?? "test-ring",
        token: process.env["GCP_AUTH_TOKEN"] ?? "test-token",
      }),
  ],
  [
    "vault",
    () =>
      new VaultKmsProvider({
        address: process.env["VAULT_ADDR"] ?? "http://localhost:8200",
        token: process.env["VAULT_TOKEN"] ?? "test-token",
      }),
  ],
  [
    "azure",
    () =>
      new AzureKmsProvider({
        vaultUrl:
          process.env["AZURE_VAULT_URL"] ?? "https://my-vault.vault.azure.net",
      }),
  ],
]);

/** Resolve a KMS provider by name. */
export function resolveKmsProvider(name?: string): KmsProvider {
  const key = (name ?? "local").toLowerCase();
  const existing = providerRegistry.get(key);
  if (existing) return existing;

  const factory = DEFAULT_FACTORIES.get(key);
  if (factory) {
    const provider = factory();
    providerRegistry.set(key, provider);
    return provider;
  }
  throw new Error(`Unsupported KMS provider: ${name}`);
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
    throw new Error("Invalid keyId format");
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
        const provider = resolveKmsProvider(b["provider"] as string);
        const meta = await provider.createKey(
          (b["algorithm"] as string) ?? "aes-256-gcm",
          (b["usage"] as "encrypt" | "sign" | "wrap") ?? "encrypt",
          b["metadata"] as Record<string, string>,
        );
        return reply.send({ data: meta });
      } catch (err) {
        return classifyCryptoError(err, request, reply, "KMS CreateKey");
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
        const provider = resolveKmsProvider(b["provider"] as string);
        if (!provider.wrapKey) {
          throw new Error(`Provider ${provider.name} does not support wrapKey`);
        }
        const keyId = sanitizeKeyId(b["keyId"]);
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
        return classifyCryptoError(err, request, reply, "KMS Wrap");
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
        const provider = resolveKmsProvider(b["provider"] as string);
        if (!provider.unwrapKey) {
          throw new Error(
            `Provider ${provider.name} does not support unwrapKey`,
          );
        }
        const keyId = sanitizeKeyId(b["keyId"]);
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
        return classifyCryptoError(err, request, reply, "KMS Unwrap");
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
        const provider = resolveKmsProvider(b["provider"] as string);
        const keyId = sanitizeKeyId(b["keyId"]);
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
        return classifyCryptoError(err, request, reply, "KMS GenerateDataKey");
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
        const provider = resolveKmsProvider(b["provider"] as string);
        const keyId = sanitizeKeyId(b["keyId"]);
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
        return classifyCryptoError(err, request, reply, "KMS Encrypt");
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
        const provider = resolveKmsProvider(b["provider"] as string);
        const keyId = sanitizeKeyId(b["keyId"]);
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
        return classifyCryptoError(err, request, reply, "KMS Decrypt");
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
