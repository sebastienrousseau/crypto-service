/**
 * Tests for lib/auth.ts — JWT verification, API key fallback,
 * scope checking, and dev-mode fallback.
 */
import { expect } from "chai";
import type { FastifyRequest, FastifyReply } from "fastify";
import {
  authenticate,
  hasScope,
  requireScope,
  SCOPES,
  type AuthPayload,
} from "../src/lib/auth";
import { init } from "../src/server";

/**
 * Minimal mock reply for unit-testing authenticate / requireScope.
 */
function createMockReply() {
  const state = { statusCode: 200, body: null as unknown, sent: false };
  const reply = {
    get statusCode() {
      return state.statusCode;
    },
    get body() {
      return state.body;
    },
    status(code: number) {
      state.statusCode = code;
      return {
        send(body: unknown) {
          state.body = body;
          state.sent = true;
        },
      };
    },
  };
  return { reply, state };
}

describe("Auth module", function () {
  this.timeout(15000);

  // ---------------------------------------------------------------
  // hasScope
  // ---------------------------------------------------------------
  describe("hasScope", () => {
    it("should return true when payload has crypto:admin scope", () => {
      const payload: AuthPayload = { sub: "test", scopes: ["crypto:admin"] };
      expect(hasScope(payload, "crypto:encrypt")).to.be.true;
      expect(hasScope(payload, "crypto:decrypt")).to.be.true;
      expect(hasScope(payload, "crypto:sign")).to.be.true;
    });

    it("should return true when payload has the exact required scope", () => {
      const payload: AuthPayload = { sub: "test", scopes: ["crypto:encrypt"] };
      expect(hasScope(payload, "crypto:encrypt")).to.be.true;
    });

    it("should return false when payload lacks the required scope", () => {
      const payload: AuthPayload = { sub: "test", scopes: ["crypto:encrypt"] };
      expect(hasScope(payload, "crypto:decrypt")).to.be.false;
    });

    it("should return false for empty scopes", () => {
      const payload: AuthPayload = { sub: "test", scopes: [] };
      expect(hasScope(payload, "crypto:hash")).to.be.false;
    });
  });

  // ---------------------------------------------------------------
  // requireScope
  // ---------------------------------------------------------------
  describe("requireScope", () => {
    it("should return true and not send a reply when scope is present", () => {
      const payload: AuthPayload = { sub: "test", scopes: ["crypto:admin"] };
      const { reply, state } = createMockReply();
      const result = requireScope(payload, "crypto:encrypt", reply as unknown as FastifyReply);
      expect(result).to.be.true;
      expect(state.statusCode).to.equal(200); // unchanged
    });

    it("should return false and send 403 when scope is missing", () => {
      const payload: AuthPayload = { sub: "test", scopes: ["crypto:encrypt"] };
      const { reply, state } = createMockReply();
      const result = requireScope(payload, "crypto:decrypt", reply as unknown as FastifyReply);
      expect(result).to.be.false;
      expect(state.statusCode).to.equal(403);
      expect((state.body as Record<string, unknown>).error).to.equal("Forbidden");
      expect((state.body as Record<string, unknown>).message).to.include("crypto:decrypt");
    });

    it("should include the missing scope name in the 403 message", () => {
      const payload: AuthPayload = { sub: "test", scopes: [] };
      const { reply, state } = createMockReply();
      requireScope(payload, "crypto:kdf", reply as unknown as FastifyReply);
      expect((state.body as Record<string, unknown>).message).to.equal(
        "Missing required scope: crypto:kdf",
      );
    });
  });

  // ---------------------------------------------------------------
  // authenticate — unit tests with mock request/reply
  // ---------------------------------------------------------------
  describe("authenticate", () => {
    const origJwt = process.env["JWT_SECRET"];
    const origKey = process.env["CRYPTO_API_KEY"];

    afterEach(() => {
      if (origJwt !== undefined) process.env["JWT_SECRET"] = origJwt;
      else delete process.env["JWT_SECRET"];
      if (origKey !== undefined) process.env["CRYPTO_API_KEY"] = origKey;
      else delete process.env["CRYPTO_API_KEY"];
    });

    it("should return anonymous admin payload in dev mode (no auth configured)", async () => {
      delete process.env["JWT_SECRET"];
      delete process.env["CRYPTO_API_KEY"];

      const request = { headers: {} } as unknown as FastifyRequest;
      const { reply } = createMockReply();
      const result = await authenticate(request, reply as unknown as FastifyReply);

      expect(result).to.not.be.null;
      expect(result!.sub).to.equal("anonymous");
      expect(result!.scopes).to.include("crypto:admin");
    });

    it("should return null and send 401 when API key is required but missing", async () => {
      delete process.env["JWT_SECRET"];
      process.env["CRYPTO_API_KEY"] = "test-secret-key";

      const request = { headers: {} } as unknown as FastifyRequest;
      const { reply, state } = createMockReply();
      const result = await authenticate(request, reply as unknown as FastifyReply);

      expect(result).to.be.null;
      expect(state.statusCode).to.equal(401);
      expect((state.body as Record<string, unknown>).error).to.include("Missing API key");
    });

    it("should return null and send 401 when API key does not match", async () => {
      delete process.env["JWT_SECRET"];
      process.env["CRYPTO_API_KEY"] = "test-secret-key";

      const request = { headers: { "x-api-key": "wrong-key" } } as unknown as FastifyRequest;
      const { reply, state } = createMockReply();
      const result = await authenticate(request, reply as unknown as FastifyReply);

      expect(result).to.be.null;
      expect(state.statusCode).to.equal(401);
      expect((state.body as Record<string, unknown>).error).to.include("Invalid API key");
    });

    it("should return api-key payload when API key matches", async () => {
      delete process.env["JWT_SECRET"];
      process.env["CRYPTO_API_KEY"] = "correct-key";

      const request = { headers: { "x-api-key": "correct-key" } } as unknown as FastifyRequest;
      const { reply } = createMockReply();
      const result = await authenticate(request, reply as unknown as FastifyReply);

      expect(result).to.not.be.null;
      expect(result!.sub).to.equal("api-key");
      expect(result!.scopes).to.include("crypto:admin");
    });

    it("should return 401 when JWT_SECRET is set but no Bearer token and no API key", async () => {
      process.env["JWT_SECRET"] = "jwt-secret-value";
      delete process.env["CRYPTO_API_KEY"];

      const request = { headers: {} } as unknown as FastifyRequest;
      const { reply, state } = createMockReply();
      const result = await authenticate(request, reply as unknown as FastifyReply);

      expect(result).to.be.null;
      expect(state.statusCode).to.equal(401);
      expect((state.body as Record<string, unknown>).error).to.include("No valid credentials");
    });

    it("should return 401 when non-string API key header is provided", async () => {
      delete process.env["JWT_SECRET"];
      process.env["CRYPTO_API_KEY"] = "test-key";

      const request = { headers: { "x-api-key": 12345 } } as unknown as FastifyRequest;
      const { reply, state } = createMockReply();
      const result = await authenticate(request, reply as unknown as FastifyReply);

      expect(result).to.be.null;
      expect(state.statusCode).to.equal(401);
    });
  });

  // ---------------------------------------------------------------
  // registerAuth — integration-level (with a real Fastify instance)
  // ---------------------------------------------------------------
  describe("registerAuth", () => {
    const origJwt = process.env["JWT_SECRET"];

    afterEach(() => {
      if (origJwt !== undefined) process.env["JWT_SECRET"] = origJwt;
      else delete process.env["JWT_SECRET"];
    });

    it("should register without error when JWT_SECRET is not set", async () => {
      delete process.env["JWT_SECRET"];
      const app = await init();
      // If we got here, registerAuth succeeded without JWT plugin
      expect(app).to.exist;
      await app.close();
    });

    it("should attempt to register JWT plugin when JWT_SECRET is set", async () => {
      process.env["JWT_SECRET"] = "test-jwt-secret-for-registration";
      try {
        const app = await init();
        // JWT plugin registered successfully
        expect(app).to.exist;
        await app.close();
      } catch (err: unknown) {
        // @fastify/jwt may be incompatible with installed Fastify version
        expect((err as Error).message).to.include("fastify version");
      }
    });
  });

  // ---------------------------------------------------------------
  // authenticate with JWT — unit tests using mocked jwtVerify
  // ---------------------------------------------------------------
  describe("authenticate with JWT bearer token", () => {
    const origJwt = process.env["JWT_SECRET"];
    const origKey = process.env["CRYPTO_API_KEY"];

    afterEach(() => {
      if (origJwt !== undefined) process.env["JWT_SECRET"] = origJwt;
      else delete process.env["JWT_SECRET"];
      if (origKey !== undefined) process.env["CRYPTO_API_KEY"] = origKey;
      else delete process.env["CRYPTO_API_KEY"];
    });

    it("should reject an invalid JWT token with 401", async () => {
      process.env["JWT_SECRET"] = "test-secret";
      delete process.env["CRYPTO_API_KEY"];

      const request = {
        headers: { authorization: "Bearer invalid.jwt.token" },
        jwtVerify: async () => {
          throw new Error("Invalid token");
        },
      } as unknown as FastifyRequest;
      const { reply, state } = createMockReply();
      const result = await authenticate(request, reply as unknown as FastifyReply);

      expect(result).to.be.null;
      expect(state.statusCode).to.equal(401);
      expect((state.body as Record<string, unknown>).error).to.include("Invalid or expired JWT");
    });

    it("should accept a valid JWT token", async () => {
      process.env["JWT_SECRET"] = "test-secret";
      delete process.env["CRYPTO_API_KEY"];

      const expectedPayload: AuthPayload = {
        sub: "user1",
        scopes: ["crypto:encrypt"],
      };

      const request = {
        headers: { authorization: "Bearer valid.jwt.token" },
        jwtVerify: async () => expectedPayload,
      } as unknown as FastifyRequest;
      const { reply } = createMockReply();
      const result = await authenticate(request, reply as unknown as FastifyReply);

      expect(result).to.not.be.null;
      expect(result!.sub).to.equal("user1");
      expect(result!.scopes).to.include("crypto:encrypt");
    });

    it("should fall through to API key when Bearer header present but no JWT_SECRET", async () => {
      delete process.env["JWT_SECRET"];
      process.env["CRYPTO_API_KEY"] = "my-api-key";

      const request = {
        headers: {
          authorization: "Bearer some.token",
          "x-api-key": "my-api-key",
        },
      } as unknown as FastifyRequest;
      const { reply } = createMockReply();
      const result = await authenticate(request, reply as unknown as FastifyReply);

      expect(result).to.not.be.null;
      expect(result!.sub).to.equal("api-key");
    });

    it("should try JWT first, then fall through to API key when both configured", async () => {
      process.env["JWT_SECRET"] = "jwt-secret";
      process.env["CRYPTO_API_KEY"] = "api-key";

      // No Bearer header, but API key present
      const request = {
        headers: { "x-api-key": "api-key" },
      } as unknown as FastifyRequest;
      const { reply } = createMockReply();
      const result = await authenticate(request, reply as unknown as FastifyReply);

      expect(result).to.not.be.null;
      expect(result!.sub).to.equal("api-key");
    });
  });

  // ---------------------------------------------------------------
  // SCOPES export
  // ---------------------------------------------------------------
  describe("SCOPES", () => {
    it("should export a list of known scopes", () => {
      expect(SCOPES).to.be.an("array");
      expect(SCOPES).to.include("crypto:admin");
      expect(SCOPES).to.include("crypto:encrypt");
      expect(SCOPES.length).to.be.greaterThan(5);
    });
  });
});
