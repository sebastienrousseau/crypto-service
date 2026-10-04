/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";
import {
  registerKmsProvider,
  resetKmsProviders,
  resolveKmsProvider,
} from "../src/routes/v2/kms";
import type { KmsProvider } from "@sebastienrousseau/crypto-kms";

describe("KMS Routes (/v2/kms)", function () {
  this.timeout(60000);
  let app: FastifyInstance;

  before(async () => {
    app = await init();
  });

  after(async () => {
    resetKmsProviders();
    await app.close();
  });

  describe("Provider resolution and registration", () => {
    it("resolves default local provider", () => {
      const p = resolveKmsProvider();
      expect(p.name).to.equal("local");
    });

    it("resolves aws, gcp, vault, and azure providers", () => {
      expect(resolveKmsProvider("aws").name).to.equal("aws");
      expect(resolveKmsProvider("gcp").name).to.equal("gcp");
      expect(resolveKmsProvider("vault").name).to.equal("vault");
      expect(resolveKmsProvider("azure").name).to.equal("azure");
    });

    it("throws on unsupported provider", () => {
      expect(() => resolveKmsProvider("unknown-cloud")).to.throw(
        "Unsupported KMS provider: unknown-cloud",
      );
    });

    it("allows registering and resetting custom provider", () => {
      const mock: KmsProvider = {
        name: "mock-provider",
        listKeys: async () => [],
        getKey: async () => ({}) as never,
        createKey: async () => ({}) as never,
        enableKey: async () => {},
        disableKey: async () => {},
        scheduleKeyDeletion: async () => {},
        encrypt: async () => ({}) as never,
        decrypt: async () => ({}) as never,
        sign: async () => ({}) as never,
        verify: async () => true,
        rotateKey: async () => ({}) as never,
        generateDataKey: async () => ({}) as never,
      };
      registerKmsProvider("mock", mock);
      expect(resolveKmsProvider("mock").name).to.equal("mock-provider");
      resetKmsProviders();
      expect(resolveKmsProvider().name).to.equal("local");
    });
  });

  describe("POST /v2/kms/create-key", () => {
    it("creates a key with default parameters", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/kms/create-key",
        payload: {},
      });
      expect(res.statusCode).to.equal(200);
      const data = JSON.parse(res.payload).data;
      expect(data).to.have.property("keyId");
      expect(data.algorithm).to.equal("aes-256-gcm");
      expect(data.usage).to.equal("encrypt");
      expect(data.enabled).to.equal(true);
    });

    it("creates a key with custom algorithm and usage", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/kms/create-key",
        payload: {
          algorithm: "ed25519",
          usage: "sign",
          metadata: { env: "test" },
        },
      });
      expect(res.statusCode).to.equal(200);
      const data = JSON.parse(res.payload).data;
      expect(data.algorithm).to.equal("ed25519");
      expect(data.usage).to.equal("sign");
    });

    it("handles errors when creating keys with unsupported provider", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/kms/create-key",
        payload: { provider: "invalid" },
      });
      expect(res.statusCode).to.be.greaterThanOrEqual(400);
    });
  });

  describe("POST /v2/kms/wrap and /v2/kms/unwrap", () => {
    it("wraps and unwraps key material roundtrip", async () => {
      // Create wrapping key
      const createRes = await app.inject({
        method: "POST",
        url: "/v2/kms/create-key",
        payload: { algorithm: "aes-256-gcm", usage: "wrap" },
      });
      const keyId = JSON.parse(createRes.payload).data.keyId;

      const rawKey =
        "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";
      const wrapRes = await app.inject({
        method: "POST",
        url: "/v2/kms/wrap",
        payload: {
          keyId,
          unwrappedKey: rawKey,
          context: { purpose: "dek-protection" },
        },
      });
      expect(wrapRes.statusCode).to.equal(200);
      const wrapped = JSON.parse(wrapRes.payload).data;
      expect(wrapped).to.have.property("wrappedKey");
      expect(wrapped.provider).to.equal("local");

      const unwrapRes = await app.inject({
        method: "POST",
        url: "/v2/kms/unwrap",
        payload: {
          keyId,
          wrappedKey: wrapped.wrappedKey,
          context: { purpose: "dek-protection" },
        },
      });
      expect(unwrapRes.statusCode).to.equal(200);
      const unwrapped = JSON.parse(unwrapRes.payload).data;
      expect(unwrapped.unwrappedKey).to.equal(rawKey);
      expect(unwrapped.keyId).to.equal(keyId);
    });

    it("returns error when wrapping with unknown key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/kms/wrap",
        payload: {
          keyId: "nonexistent-key",
          unwrappedKey: "deadbeef",
        },
      });
      expect(res.statusCode).to.be.greaterThanOrEqual(400);
    });

    it("returns error when unwrapping with unknown key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/kms/unwrap",
        payload: {
          keyId: "nonexistent-key",
          wrappedKey: "invalid-payload",
        },
      });
      expect(res.statusCode).to.be.greaterThanOrEqual(400);
    });

    it("returns error when provider lacks wrapKey or unwrapKey", async () => {
      const mock: KmsProvider = {
        name: "no-wrap-provider",
        listKeys: async () => [],
        getKey: async () => ({}) as never,
        createKey: async () => ({}) as never,
        enableKey: async () => {},
        disableKey: async () => {},
        scheduleKeyDeletion: async () => {},
        encrypt: async () => ({}) as never,
        decrypt: async () => ({}) as never,
        sign: async () => ({}) as never,
        verify: async () => true,
        rotateKey: async () => ({}) as never,
        generateDataKey: async () => ({}) as never,
      };
      registerKmsProvider("no-wrap", mock);

      const wrapRes = await app.inject({
        method: "POST",
        url: "/v2/kms/wrap",
        payload: {
          provider: "no-wrap",
          keyId: "k",
          unwrappedKey: "1234",
        },
      });
      expect(wrapRes.statusCode).to.be.greaterThanOrEqual(400);

      const unwrapRes = await app.inject({
        method: "POST",
        url: "/v2/kms/unwrap",
        payload: {
          provider: "no-wrap",
          keyId: "k",
          wrappedKey: "1234",
        },
      });
      expect(unwrapRes.statusCode).to.be.greaterThanOrEqual(400);
      resetKmsProviders();
    });
  });

  describe("POST /v2/kms/generate-data-key", () => {
    it("generates plaintext and ciphertext data key", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/v2/kms/create-key",
        payload: { algorithm: "aes-256-gcm", usage: "encrypt" },
      });
      const keyId = JSON.parse(createRes.payload).data.keyId;

      const res = await app.inject({
        method: "POST",
        url: "/v2/kms/generate-data-key",
        payload: { keyId },
      });
      expect(res.statusCode).to.equal(200);
      const data = JSON.parse(res.payload).data;
      expect(data).to.have.property("plaintext");
      expect(data).to.have.property("ciphertext");
      expect(data.keyId).to.equal(keyId);
      expect(data.provider).to.equal("local");
    });

    it("returns error when generating data key with invalid key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/kms/generate-data-key",
        payload: { keyId: "invalid-key-id" },
      });
      expect(res.statusCode).to.be.greaterThanOrEqual(400);
    });
  });

  describe("POST /v2/kms/encrypt and /v2/kms/decrypt", () => {
    it("encrypts and decrypts plaintext roundtrip", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/v2/kms/create-key",
        payload: { algorithm: "aes-256-gcm", usage: "encrypt" },
      });
      const keyId = JSON.parse(createRes.payload).data.keyId;

      const message = "Secret message destined for KMS encryption";
      const encRes = await app.inject({
        method: "POST",
        url: "/v2/kms/encrypt",
        payload: {
          keyId,
          plaintext: message,
          context: { tenant: "org-123" },
        },
      });
      expect(encRes.statusCode).to.equal(200);
      const encData = JSON.parse(encRes.payload).data;
      expect(encData).to.have.property("ciphertext");
      expect(encData.provider).to.equal("local");

      const decRes = await app.inject({
        method: "POST",
        url: "/v2/kms/decrypt",
        payload: {
          keyId,
          ciphertext: encData.ciphertext,
          context: { tenant: "org-123" },
        },
      });
      expect(decRes.statusCode).to.equal(200);
      const decData = JSON.parse(decRes.payload).data;
      expect(decData.plaintext).to.equal(message);
      expect(decData.keyId).to.equal(keyId);
      expect(decData.provider).to.equal("local");
    });

    it("returns error on encryption with invalid key", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/kms/encrypt",
        payload: {
          keyId: "bad-key",
          plaintext: "secret",
        },
      });
      expect(res.statusCode).to.be.greaterThanOrEqual(400);
    });

    it("returns error on decryption with invalid key or ciphertext", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/kms/decrypt",
        payload: {
          keyId: "bad-key",
          ciphertext: "corrupted-ciphertext",
        },
      });
      expect(res.statusCode).to.be.greaterThanOrEqual(400);
    });
  });
});
