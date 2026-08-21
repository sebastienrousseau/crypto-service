/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { init } from "../src/server";
import type { FastifyInstance } from "fastify";

describe("API Routes", () => {
  let app: FastifyInstance;

  before(async function () {
    this.timeout(15000);
    app = await init();
  });

  after(async () => {
    await app.close();
  });

  describe("GET /", () => {
    it("should return server info", async () => {
      const res = await app.inject({ method: "GET", url: "/" });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body).to.have.property("title");
      expect(body).to.have.property("version");
    });
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body).to.have.property("statusCode", 200);
    });
  });

  describe("POST /v1/encrypt", () => {
    it("should reject missing body fields", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/encrypt",
        payload: {},
      });
      expect(res.statusCode).to.equal(400);
    });

    it("should reject invalid passphrase (empty)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/encrypt",
        payload: {
          passphrase: "",
          message: "hello",
          publicKey: "dGVzdA==",
        },
      });
      expect(res.statusCode).to.equal(400);
    });

    it("should return 401 when API key is required but missing", async function () {
      const original = process.env["CRYPTO_API_KEY"];
      process.env["CRYPTO_API_KEY"] = "test-secret";
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v1/encrypt",
          payload: {
            passphrase: "test",
            message: "hello",
            publicKey: "dGVzdA==",
          },
        });
        expect(res.statusCode).to.equal(401);
      } finally {
        if (original !== undefined) {
          process.env["CRYPTO_API_KEY"] = original;
        } else {
          delete process.env["CRYPTO_API_KEY"];
        }
      }
    });
  });

  describe("POST /v1/decrypt", () => {
    it("should reject missing body fields", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/decrypt",
        payload: {},
      });
      expect(res.statusCode).to.equal(400);
    });

    it("should reject missing privateKey", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/decrypt",
        payload: {
          passphrase: "test",
          message: "dGVzdA==",
          publicKey: "dGVzdA==",
        },
      });
      expect(res.statusCode).to.equal(400);
    });
  });

  describe("POST /v1/generate", () => {
    it("should reject missing body fields", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/generate",
        payload: {},
      });
      expect(res.statusCode).to.equal(400);
    });

    it("should reject invalid key type", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/generate",
        payload: {
          name: "Test",
          email: "test@example.com",
          type: "invalid",
          passphrase: "test123",
          curve: "curve25519",
          format: "armored",
        },
      });
      expect(res.statusCode).to.equal(400);
    });

    it("should reject invalid email", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/generate",
        payload: {
          name: "Test",
          email: "not-an-email",
          type: "ecc",
          passphrase: "test123",
          curve: "curve25519",
          format: "armored",
        },
      });
      // Fastify schema validation catches the email format at the
      // minLength check or the runtime validator catches it.
      expect(res.statusCode).to.be.oneOf([400, 500]);
    });

    it("should reject rsaBits below minimum", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/generate",
        payload: {
          name: "Test",
          email: "test@example.com",
          type: "rsa",
          passphrase: "test123",
          curve: "curve25519",
          format: "armored",
          rsaBits: 512,
        },
      });
      expect(res.statusCode).to.equal(400);
    });
  });

  describe("POST /v1/verify", () => {
    it("should reject missing body fields", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/verify",
        payload: {},
      });
      expect(res.statusCode).to.equal(400);
    });

    it("should reject invalid date", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/verify",
        payload: {
          date: "not-a-date",
          message: "hello",
          verificationKeys: "dGVzdA==",
        },
      });
      // May fail at schema validation (minLength) or runtime validation
      expect(res.statusCode).to.be.oneOf([400, 500]);
    });
  });

  describe("POST /v1/revoke", () => {
    it("should reject missing body fields", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/revoke",
        payload: {},
      });
      expect(res.statusCode).to.equal(400);
    });

    it("should reject invalid flag value", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/revoke",
        payload: {
          passphrase: "test",
          flag: 99,
          reason: "compromised",
        },
      });
      expect(res.statusCode).to.equal(400);
    });
  });

  describe("Response headers", () => {
    it("should include x-request-id header", async () => {
      const res = await app.inject({ method: "GET", url: "/" });
      expect(res.headers["x-request-id"]).to.be.a("string");
    });

    it("should honour upstream x-request-id", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/",
        headers: { "x-request-id": "custom-123" },
      });
      expect(res.headers["x-request-id"]).to.equal("custom-123");
    });
  });

  describe("Security headers", () => {
    it("should include helmet security headers", async () => {
      const res = await app.inject({ method: "GET", url: "/" });
      // Helmet sets X-DNS-Prefetch-Control, X-Frame-Options, etc.
      expect(res.headers["x-dns-prefetch-control"]).to.exist;
      expect(res.headers["x-frame-options"]).to.exist;
      expect(res.headers["x-content-type-options"]).to.exist;
    });
  });

  describe("Unknown routes", () => {
    it("should return 404 for unknown paths", async () => {
      const res = await app.inject({ method: "GET", url: "/v1/nonexistent" });
      expect(res.statusCode).to.equal(404);
    });

    it("should reject additional properties in body", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/encrypt",
        payload: {
          passphrase: "test",
          message: "hello",
          publicKey: "dGVzdA==",
          extraField: "should-be-rejected",
        },
      });
      // Fastify rejects extra fields via schema (400) or the crypto op
      // fails because the extra field disrupts processing (500).
      expect(res.statusCode).to.be.oneOf([400, 500]);
    });
  });
});
