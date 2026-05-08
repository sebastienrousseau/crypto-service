/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import * as crypto from "node:crypto";

// --- Types ---
import { CryptoMiddlewareError } from "../src/types";

// --- Common functions ---
import {
  encryptPayload,
  decryptPayload,
  verifyHmacSignature,
  verifyJwt,
  matchRoute,
} from "../src/common";

// --- Barrel re-exports ---
import * as barrel from "../src/index";

// 32-byte hex key (256-bit) for secretbox
const TEST_KEY = "aa".repeat(32);
// HMAC key (hex-encoded)
const HMAC_KEY = "bb".repeat(32);
// JWT secret (plain UTF-8 string, as verifyJwt converts to hex internally)
const JWT_SECRET = "super-secret-jwt-key";

// ---------------------------------------------------------------------------
// Helpers: create HS256 JWT tokens
// ---------------------------------------------------------------------------

function base64url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function createJwt(
  payload: Record<string, unknown>,
  secret: string,
  headerOverrides?: Record<string, unknown>,
): string {
  const header = { alg: "HS256", typ: "JWT", ...headerOverrides };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(signingInput)
    .digest();
  const sigB64 = base64url(sig);
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

// ---------------------------------------------------------------------------
// Tests: CryptoMiddlewareError (types.ts)
// ---------------------------------------------------------------------------

describe("CryptoMiddlewareError", () => {
  it("should construct with message, statusCode, and code", () => {
    const err = new CryptoMiddlewareError("test error", 400, "TEST_CODE");
    expect(err).to.be.instanceOf(Error);
    expect(err).to.be.instanceOf(CryptoMiddlewareError);
    expect(err.message).to.equal("test error");
    expect(err.statusCode).to.equal(400);
    expect(err.code).to.equal("TEST_CODE");
    expect(err.name).to.equal("CryptoMiddlewareError");
  });
});

// ---------------------------------------------------------------------------
// Tests: encryptPayload / decryptPayload (common.ts)
// ---------------------------------------------------------------------------

describe("encryptPayload / decryptPayload", () => {
  it("should round-trip a JSON object", () => {
    const original = { hello: "world", n: 42 };
    const sealed = encryptPayload(TEST_KEY, original);
    expect(sealed).to.be.a("string");
    const decrypted = decryptPayload(TEST_KEY, sealed);
    expect(decrypted).to.deep.equal(original);
  });

  it("should round-trip a string payload that is valid JSON", () => {
    // encryptPayload passes strings as-is; decryptPayload JSON.parse's the result
    // So the plaintext string must itself be valid JSON to survive the round-trip.
    const original = '"plain string"'; // JSON-encoded string
    const sealed = encryptPayload(TEST_KEY, original);
    const decrypted = decryptPayload(TEST_KEY, sealed);
    expect(decrypted).to.equal("plain string");
  });

  it("should encrypt a non-JSON string (decrypt will fail since parse fails)", () => {
    // encryptPayload passes strings through as-is without JSON.stringify
    const sealed = encryptPayload(TEST_KEY, "not valid json");
    expect(sealed).to.be.a("string");
    // Decrypting will fail because "not valid json" is not parseable JSON
    try {
      decryptPayload(TEST_KEY, sealed);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).to.be.instanceOf(CryptoMiddlewareError);
      const e = err as CryptoMiddlewareError;
      expect(e.code).to.equal("DECRYPTION_FAILED");
    }
  });

  it("should round-trip an array", () => {
    const original = [1, 2, 3];
    const sealed = encryptPayload(TEST_KEY, original);
    const decrypted = decryptPayload(TEST_KEY, sealed);
    expect(decrypted).to.deep.equal([1, 2, 3]);
  });

  it("should round-trip a number", () => {
    const sealed = encryptPayload(TEST_KEY, 42);
    const decrypted = decryptPayload(TEST_KEY, sealed);
    expect(decrypted).to.equal(42);
  });

  it("should round-trip a boolean", () => {
    const sealed = encryptPayload(TEST_KEY, true);
    const decrypted = decryptPayload(TEST_KEY, sealed);
    expect(decrypted).to.equal(true);
  });

  it("should round-trip null", () => {
    const sealed = encryptPayload(TEST_KEY, null);
    const decrypted = decryptPayload(TEST_KEY, sealed);
    expect(decrypted).to.equal(null);
  });

  it("should produce different ciphertexts for same input (random nonce)", () => {
    const data = { same: "data" };
    const s1 = encryptPayload(TEST_KEY, data);
    const s2 = encryptPayload(TEST_KEY, data);
    expect(s1).to.not.equal(s2);
  });

  it("should throw CryptoMiddlewareError on decryption with wrong key", () => {
    const sealed = encryptPayload(TEST_KEY, { secret: true });
    const wrongKey = "cc".repeat(32);
    try {
      decryptPayload(wrongKey, sealed);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).to.be.instanceOf(CryptoMiddlewareError);
      const e = err as CryptoMiddlewareError;
      expect(e.statusCode).to.equal(400);
      expect(e.code).to.equal("DECRYPTION_FAILED");
      expect(e.message).to.include("Decryption failed");
    }
  });

  it("should throw CryptoMiddlewareError on malformed sealed data", () => {
    try {
      decryptPayload(TEST_KEY, "not-valid-base64-sealed-data!!!");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).to.be.instanceOf(CryptoMiddlewareError);
      const e = err as CryptoMiddlewareError;
      expect(e.code).to.equal("DECRYPTION_FAILED");
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: verifyHmacSignature (common.ts)
// ---------------------------------------------------------------------------

describe("verifyHmacSignature", () => {
  function computeSignature(key: string, body: string): string {
    // Use crypto-lib's computeHmac via node:crypto for test-helper parity
    const keyBuf = Buffer.from(key, "hex");
    return crypto.createHmac("sha256", keyBuf).update(body).digest("hex");
  }

  it("should return true for a valid raw hex signature", () => {
    const body = '{"event":"push"}';
    const sig = computeSignature(HMAC_KEY, body);
    const result = verifyHmacSignature(HMAC_KEY, body, sig);
    expect(result).to.equal(true);
  });

  it("should return true for a valid sha256= prefixed signature", () => {
    const body = '{"event":"push"}';
    const sig = computeSignature(HMAC_KEY, body);
    const result = verifyHmacSignature(HMAC_KEY, body, `sha256=${sig}`);
    expect(result).to.equal(true);
  });

  it("should throw MISSING_SIGNATURE for empty signature", () => {
    try {
      verifyHmacSignature(HMAC_KEY, "body", "");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).to.be.instanceOf(CryptoMiddlewareError);
      const e = err as CryptoMiddlewareError;
      expect(e.statusCode).to.equal(401);
      expect(e.code).to.equal("MISSING_SIGNATURE");
    }
  });

  it("should throw INVALID_SIGNATURE for wrong signature", () => {
    try {
      verifyHmacSignature(HMAC_KEY, "body", "deadbeef".repeat(8));
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).to.be.instanceOf(CryptoMiddlewareError);
      const e = err as CryptoMiddlewareError;
      expect(e.statusCode).to.equal(401);
      expect(e.code).to.equal("INVALID_SIGNATURE");
    }
  });

  it("should throw INVALID_SIGNATURE for wrong key", () => {
    const body = "test body";
    const sig = computeSignature(HMAC_KEY, body);
    const wrongKey = "dd".repeat(32);
    try {
      verifyHmacSignature(wrongKey, body, sig);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).to.be.instanceOf(CryptoMiddlewareError);
      const e = err as CryptoMiddlewareError;
      expect(e.code).to.equal("INVALID_SIGNATURE");
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: verifyJwt (common.ts)
// ---------------------------------------------------------------------------

describe("verifyJwt", () => {
  it("should verify a valid HS256 JWT", () => {
    const payload = { sub: "user123", iss: "test", iat: Math.floor(Date.now() / 1000) };
    const token = createJwt(payload, JWT_SECRET);
    const result = verifyJwt(JWT_SECRET, token);
    expect(result.sub).to.equal("user123");
    expect(result.iss).to.equal("test");
  });

  it("should verify a JWT with exp in the future", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = createJwt({ sub: "u", exp: futureExp }, JWT_SECRET);
    const result = verifyJwt(JWT_SECRET, token);
    expect(result.exp).to.equal(futureExp);
  });

  it("should verify a JWT with nbf in the past", () => {
    const pastNbf = Math.floor(Date.now() / 1000) - 3600;
    const token = createJwt({ sub: "u", nbf: pastNbf }, JWT_SECRET);
    const result = verifyJwt(JWT_SECRET, token);
    expect(result.nbf).to.equal(pastNbf);
  });

  it("should return arbitrary claims", () => {
    const token = createJwt({ sub: "u", role: "admin", custom: 99 }, JWT_SECRET);
    const result = verifyJwt(JWT_SECRET, token);
    expect(result.role).to.equal("admin");
    expect(result.custom).to.equal(99);
  });

  it("should throw MISSING_TOKEN for empty token", () => {
    try {
      verifyJwt(JWT_SECRET, "");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).to.be.instanceOf(CryptoMiddlewareError);
      const e = err as CryptoMiddlewareError;
      expect(e.code).to.equal("MISSING_TOKEN");
    }
  });

  it("should throw MALFORMED_TOKEN for token with wrong number of parts", () => {
    try {
      verifyJwt(JWT_SECRET, "only.two");
      expect.fail("should have thrown");
    } catch (err) {
      const e = err as CryptoMiddlewareError;
      expect(e.code).to.equal("MALFORMED_TOKEN");
      expect(e.message).to.include("expected 3 parts");
    }
  });

  it("should throw MALFORMED_TOKEN for non-JSON header", () => {
    const badHeader = base64url("not-json");
    const payloadB64 = base64url(JSON.stringify({ sub: "u" }));
    try {
      verifyJwt(JWT_SECRET, `${badHeader}.${payloadB64}.sig`);
      expect.fail("should have thrown");
    } catch (err) {
      const e = err as CryptoMiddlewareError;
      expect(e.code).to.equal("MALFORMED_TOKEN");
      expect(e.message).to.include("header");
    }
  });

  it("should throw UNSUPPORTED_ALGORITHM for non-HS256 algorithm", () => {
    const headerB64 = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payloadB64 = base64url(JSON.stringify({ sub: "u" }));
    try {
      verifyJwt(JWT_SECRET, `${headerB64}.${payloadB64}.signature`);
      expect.fail("should have thrown");
    } catch (err) {
      const e = err as CryptoMiddlewareError;
      expect(e.code).to.equal("UNSUPPORTED_ALGORITHM");
      expect(e.message).to.include("RS256");
    }
  });

  it("should throw INVALID_TOKEN for wrong secret", () => {
    const token = createJwt({ sub: "u" }, JWT_SECRET);
    try {
      verifyJwt("wrong-secret", token);
      expect.fail("should have thrown");
    } catch (err) {
      const e = err as CryptoMiddlewareError;
      expect(e.code).to.equal("INVALID_TOKEN");
      expect(e.message).to.include("Invalid JWT signature");
    }
  });

  it("should throw TOKEN_EXPIRED for expired token", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const token = createJwt({ sub: "u", exp: pastExp }, JWT_SECRET);
    try {
      verifyJwt(JWT_SECRET, token);
      expect.fail("should have thrown");
    } catch (err) {
      const e = err as CryptoMiddlewareError;
      expect(e.code).to.equal("TOKEN_EXPIRED");
    }
  });

  it("should throw TOKEN_NOT_YET_VALID for future nbf", () => {
    const futureNbf = Math.floor(Date.now() / 1000) + 3600;
    const token = createJwt({ sub: "u", nbf: futureNbf }, JWT_SECRET);
    try {
      verifyJwt(JWT_SECRET, token);
      expect.fail("should have thrown");
    } catch (err) {
      const e = err as CryptoMiddlewareError;
      expect(e.code).to.equal("TOKEN_NOT_YET_VALID");
    }
  });

  it("should throw MALFORMED_TOKEN for non-JSON payload", () => {
    // Build a token where the header is valid HS256 but the payload is not valid JSON.
    // We need a valid signature over the header.payload so it passes sig verification.
    const headerB64 = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payloadB64 = base64url("not-json-{{{");
    const signingInput = `${headerB64}.${payloadB64}`;
    const sig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(signingInput)
      .digest();
    const sigB64 = base64url(sig);
    try {
      verifyJwt(JWT_SECRET, `${headerB64}.${payloadB64}.${sigB64}`);
      expect.fail("should have thrown");
    } catch (err) {
      const e = err as CryptoMiddlewareError;
      expect(e.code).to.equal("MALFORMED_TOKEN");
      expect(e.message).to.include("payload");
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: matchRoute (common.ts)
// ---------------------------------------------------------------------------

describe("matchRoute", () => {
  it("should match all routes when routes array is empty", () => {
    expect(matchRoute("/any/path", [])).to.equal(true);
    expect(matchRoute("/", [])).to.equal(true);
  });

  it("should match exact routes", () => {
    expect(matchRoute("/api/data", ["/api/data"])).to.equal(true);
    expect(matchRoute("/api/other", ["/api/data"])).to.equal(false);
  });

  it("should match single-segment wildcard (*)", () => {
    expect(matchRoute("/api/users", ["/api/*"])).to.equal(true);
    expect(matchRoute("/api/posts", ["/api/*"])).to.equal(true);
    expect(matchRoute("/api/users/123", ["/api/*"])).to.equal(false);
  });

  it("should match globstar (**)", () => {
    expect(matchRoute("/api/users", ["/api/**"])).to.equal(true);
    expect(matchRoute("/api/users/123", ["/api/**"])).to.equal(true);
    expect(matchRoute("/api/users/123/profile", ["/api/**"])).to.equal(true);
  });

  it("should not match non-matching patterns", () => {
    expect(matchRoute("/other/path", ["/api/*"])).to.equal(false);
    expect(matchRoute("/other/path", ["/api/**"])).to.equal(false);
  });

  it("should match if any pattern matches", () => {
    const routes = ["/api/v1/*", "/api/v2/**", "/health"];
    expect(matchRoute("/api/v1/data", routes)).to.equal(true);
    expect(matchRoute("/api/v2/deep/nested", routes)).to.equal(true);
    expect(matchRoute("/health", routes)).to.equal(true);
    expect(matchRoute("/unknown", routes)).to.equal(false);
  });

  it("should handle root path", () => {
    expect(matchRoute("/", ["/"])).to.equal(true);
    expect(matchRoute("/", ["/api"])).to.equal(false);
  });

  it("should handle wildcard in the middle", () => {
    expect(matchRoute("/api/v1/data", ["/api/*/data"])).to.equal(true);
    expect(matchRoute("/api/v2/data", ["/api/*/data"])).to.equal(true);
    expect(matchRoute("/api/v1/other", ["/api/*/data"])).to.equal(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Express middleware (express.ts)
// ---------------------------------------------------------------------------

describe("Express middleware (createCryptoMiddleware)", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createCryptoMiddleware } = require("../src/express");

  // Mock Express request/response/next
  function mockReq(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      path: "/api/test",
      headers: {},
      body: undefined,
      ...overrides,
    };
  }

  function mockRes(): Record<string, unknown> & {
    statusCode: number;
    _body: unknown;
    _jsonCalled: boolean;
    status: (code: number) => Record<string, unknown>;
    json: (body: unknown) => Record<string, unknown>;
  } {
    const res: Record<string, unknown> & {
      statusCode: number;
      _body: unknown;
      _jsonCalled: boolean;
      status: (code: number) => Record<string, unknown>;
      json: (body: unknown) => Record<string, unknown>;
    } = {
      statusCode: 200,
      _body: undefined,
      _jsonCalled: false,
      status(code: number) {
        res.statusCode = code;
        return res;
      },
      json(body: unknown) {
        res._body = body;
        res._jsonCalled = true;
        return res as any;
      },
    };
    return res;
  }

  // --- Route matching ---

  it("should call next() and skip processing when route does not match", () => {
    const mw = createCryptoMiddleware({
      routes: ["/api/secret"],
      operations: ["decrypt-request"],
      key: TEST_KEY,
    });
    const req = mockReq({ path: "/api/public" });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
  });

  it("should process matching routes", () => {
    const mw = createCryptoMiddleware({
      routes: ["/api/**"],
      operations: [],
      key: TEST_KEY,
    });
    const req = mockReq({ path: "/api/test" });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
  });

  it("should process all routes when routes is empty", () => {
    const mw = createCryptoMiddleware({
      operations: [],
      key: TEST_KEY,
    });
    const req = mockReq({ path: "/anything" });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
  });

  // --- decrypt-request ---

  it("should decrypt an encrypted request body", () => {
    const original = { message: "hello" };
    const sealed = encryptPayload(TEST_KEY, original);
    const mw = createCryptoMiddleware({
      operations: ["decrypt-request"],
      key: TEST_KEY,
    });
    const req = mockReq({ body: { encrypted: sealed } });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
    expect(req.body).to.deep.equal(original);
  });

  it("should skip decryption when body has no 'encrypted' field", () => {
    const mw = createCryptoMiddleware({
      operations: ["decrypt-request"],
      key: TEST_KEY,
    });
    const req = mockReq({ body: { plain: "data" } });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
    expect(req.body).to.deep.equal({ plain: "data" });
  });

  it("should skip decryption when body is undefined", () => {
    const mw = createCryptoMiddleware({
      operations: ["decrypt-request"],
      key: TEST_KEY,
    });
    const req = mockReq({ body: undefined });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
  });

  it("should skip decryption when body is a string", () => {
    const mw = createCryptoMiddleware({
      operations: ["decrypt-request"],
      key: TEST_KEY,
    });
    const req = mockReq({ body: "raw string body" });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
    expect(req.body).to.equal("raw string body");
  });

  it("should return 500 when decrypt-request is used without key", () => {
    const mw = createCryptoMiddleware({
      operations: ["decrypt-request"],
    });
    const sealed = encryptPayload(TEST_KEY, { a: 1 });
    const req = mockReq({ body: { encrypted: sealed } });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(false);
    expect(res.statusCode).to.equal(500);
    expect((res._body as any).code).to.equal("MISSING_CONFIG");
  });

  it("should return 400 when encrypted body is invalid", () => {
    const mw = createCryptoMiddleware({
      operations: ["decrypt-request"],
      key: TEST_KEY,
    });
    const req = mockReq({ body: { encrypted: "garbage-data" } });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(false);
    expect(res.statusCode).to.equal(400);
    expect((res._body as any).code).to.equal("DECRYPTION_FAILED");
  });

  // --- encrypt-response ---

  it("should intercept res.json and encrypt the response body", () => {
    const mw = createCryptoMiddleware({
      operations: ["encrypt-response"],
      key: TEST_KEY,
    });
    const req = mockReq();
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);

    // Now call the patched res.json
    res.json({ data: "secret" });
    expect(res._body).to.have.property("encrypted");
    // Decrypt and verify
    const decrypted = decryptPayload(TEST_KEY, (res._body as any).encrypted);
    expect(decrypted).to.deep.equal({ data: "secret" });
  });

  it("should return 500 when encrypt-response is used without key", () => {
    const mw = createCryptoMiddleware({
      operations: ["encrypt-response"],
    });
    const req = mockReq();
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(false);
    expect(res.statusCode).to.equal(500);
    expect((res._body as any).code).to.equal("MISSING_CONFIG");
  });

  // --- verify-signature ---

  it("should pass through with valid HMAC signature in x-signature header", () => {
    const body = '{"event":"push"}';
    const keyBuf = Buffer.from(HMAC_KEY, "hex");
    const sig = crypto.createHmac("sha256", keyBuf).update(body).digest("hex");
    const mw = createCryptoMiddleware({
      operations: ["verify-signature"],
      hmacKey: HMAC_KEY,
    });
    const req = mockReq({
      headers: { "x-signature": sig },
      body,
    });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
  });

  it("should pass through with valid HMAC signature in x-hub-signature-256 header", () => {
    const body = '{"event":"push"}';
    const keyBuf = Buffer.from(HMAC_KEY, "hex");
    const sig = crypto.createHmac("sha256", keyBuf).update(body).digest("hex");
    const mw = createCryptoMiddleware({
      operations: ["verify-signature"],
      hmacKey: HMAC_KEY,
    });
    const req = mockReq({
      headers: { "x-hub-signature-256": `sha256=${sig}` },
      body,
    });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
  });

  it("should JSON-stringify non-string body for signature verification", () => {
    const bodyObj = { event: "push" };
    const bodyStr = JSON.stringify(bodyObj);
    const keyBuf = Buffer.from(HMAC_KEY, "hex");
    const sig = crypto.createHmac("sha256", keyBuf).update(bodyStr).digest("hex");
    const mw = createCryptoMiddleware({
      operations: ["verify-signature"],
      hmacKey: HMAC_KEY,
    });
    const req = mockReq({
      headers: { "x-signature": sig },
      body: bodyObj,
    });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
  });

  it("should return 401 when HMAC signature is invalid", () => {
    const mw = createCryptoMiddleware({
      operations: ["verify-signature"],
      hmacKey: HMAC_KEY,
    });
    // Use valid hex that is simply the wrong HMAC value (64 hex chars = 32 bytes)
    const req = mockReq({
      headers: { "x-signature": "aa".repeat(32) },
      body: '{"event":"push"}',
    });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(false);
    expect(res.statusCode).to.equal(401);
  });

  it("should return 401 when HMAC signature header is missing", () => {
    const mw = createCryptoMiddleware({
      operations: ["verify-signature"],
      hmacKey: HMAC_KEY,
    });
    const req = mockReq({
      headers: {},
      body: "body",
    });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(false);
    expect(res.statusCode).to.equal(401);
    expect((res._body as any).code).to.equal("MISSING_SIGNATURE");
  });

  it("should return 500 when verify-signature is used without hmacKey", () => {
    const mw = createCryptoMiddleware({
      operations: ["verify-signature"],
    });
    const req = mockReq({
      headers: { "x-signature": "abc" },
      body: "body",
    });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(false);
    expect(res.statusCode).to.equal(500);
    expect((res._body as any).code).to.equal("MISSING_CONFIG");
  });

  // --- verify-jwt ---

  it("should pass through with valid JWT Bearer token", () => {
    const token = createJwt({ sub: "user1" }, JWT_SECRET);
    const mw = createCryptoMiddleware({
      operations: ["verify-jwt"],
      jwtSecret: JWT_SECRET,
    });
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
    expect((req as any).jwtPayload).to.have.property("sub", "user1");
  });

  it("should return 401 for missing Authorization header", () => {
    const mw = createCryptoMiddleware({
      operations: ["verify-jwt"],
      jwtSecret: JWT_SECRET,
    });
    const req = mockReq({ headers: {} });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(false);
    expect(res.statusCode).to.equal(401);
  });

  it("should return 401 for invalid JWT token", () => {
    const mw = createCryptoMiddleware({
      operations: ["verify-jwt"],
      jwtSecret: JWT_SECRET,
    });
    const req = mockReq({
      headers: { authorization: "Bearer invalid.token.here" },
    });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(false);
    expect(res.statusCode).to.equal(401);
  });

  it("should return 500 when verify-jwt is used without jwtSecret", () => {
    const mw = createCryptoMiddleware({
      operations: ["verify-jwt"],
    });
    const req = mockReq({
      headers: { authorization: "Bearer some.token.here" },
    });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(false);
    expect(res.statusCode).to.equal(500);
    expect((res._body as any).code).to.equal("MISSING_CONFIG");
  });

  it("should extract token when auth header lacks Bearer prefix (empty token)", () => {
    const mw = createCryptoMiddleware({
      operations: ["verify-jwt"],
      jwtSecret: JWT_SECRET,
    });
    const req = mockReq({
      headers: { authorization: "NotBearer something" },
    });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(false);
    // Should get MISSING_TOKEN because token becomes "" when not "Bearer " prefix
    expect(res.statusCode).to.equal(401);
  });

  // --- Non-CryptoMiddlewareError is passed to next ---

  it("should call next(err) for unexpected non-CryptoMiddlewareError errors", () => {
    const mw = createCryptoMiddleware({
      operations: ["verify-signature"],
      hmacKey: HMAC_KEY,
    });
    // Pass a non-hex signature so crypto-lib's verifyHmac throws a raw Error
    const req = mockReq({
      headers: { "x-signature": "not-hex!" },
      body: "body",
    });
    const res = mockRes();
    let nextErr: unknown = undefined;
    mw(req, res, (err?: unknown) => { nextErr = err; });
    // The raw Error should be passed to next(), not caught as CryptoMiddlewareError
    expect(nextErr).to.be.instanceOf(Error);
    expect(nextErr).to.not.be.instanceOf(CryptoMiddlewareError);
  });

  // --- Multiple operations ---

  it("should execute multiple operations in sequence", () => {
    const original = { message: "hello" };
    const sealed = encryptPayload(TEST_KEY, original);
    const token = createJwt({ sub: "user1" }, JWT_SECRET);

    const mw = createCryptoMiddleware({
      operations: ["verify-jwt", "decrypt-request", "encrypt-response"],
      key: TEST_KEY,
      jwtSecret: JWT_SECRET,
    });

    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
      body: { encrypted: sealed },
    });
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
    expect(req.body).to.deep.equal(original);
    expect((req as any).jwtPayload).to.have.property("sub", "user1");

    // res.json should be patched to encrypt
    res.json({ result: "ok" });
    expect(res._body).to.have.property("encrypted");
  });

  // --- Default operations (empty) ---

  it("should call next with no operations configured", () => {
    const mw = createCryptoMiddleware({});
    const req = mockReq();
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Fastify plugin (fastify.ts)
// ---------------------------------------------------------------------------

describe("Fastify plugin (cryptoPlugin)", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cryptoPlugin } = require("../src/fastify");

  // Helper to build a mock Fastify instance that records hooks
  function mockFastify(): {
    hooks: Record<string, Array<(...args: unknown[]) => Promise<unknown>>>;
    addHook: (name: string, fn: (...args: unknown[]) => Promise<unknown>) => void;
    register: (plugin: any, opts: any) => Promise<void>;
  } {
    const hooks: Record<string, Array<(...args: unknown[]) => Promise<unknown>>> = {};
    return {
      hooks,
      addHook(name: string, fn: (...args: unknown[]) => Promise<unknown>) {
        if (!hooks[name]) hooks[name] = [];
        hooks[name].push(fn);
      },
      async register(plugin: any, opts: any) {
        // fastify-plugin unwraps, so we call the inner function directly
        await plugin(this, opts);
      },
    };
  }

  function mockRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      url: "/api/test",
      headers: {},
      body: undefined,
      ...overrides,
    };
  }

  function mockReply(): Record<string, unknown> & {
    _statusCode: number;
    _body: unknown;
    _sent: boolean;
    code: (n: number) => Record<string, unknown>;
    send: (body: unknown) => void;
  } {
    const reply: any = {
      _statusCode: 200,
      _body: undefined,
      _sent: false,
      code(n: number) {
        reply._statusCode = n;
        return reply;
      },
      send(body: unknown) {
        reply._body = body;
        reply._sent = true;
      },
    };
    return reply;
  }

  it("should be a function (fastify-plugin wrapped)", () => {
    expect(cryptoPlugin).to.be.a("function");
  });

  it("should register hooks on the fastify instance", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-jwt", "verify-signature", "decrypt-request", "encrypt-response"],
      key: TEST_KEY,
      hmacKey: HMAC_KEY,
      jwtSecret: JWT_SECRET,
    });
    expect(fastify.hooks).to.have.property("onRequest");
    expect(fastify.hooks).to.have.property("preHandler");
    expect(fastify.hooks).to.have.property("preSerialization");
  });

  it("should not register preHandler/preSerialization if operations do not require them", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-jwt"],
      jwtSecret: JWT_SECRET,
    });
    expect(fastify.hooks).to.have.property("onRequest");
    expect(fastify.hooks).to.not.have.property("preHandler");
    expect(fastify.hooks).to.not.have.property("preSerialization");
  });

  // --- onRequest: verify-jwt ---

  it("should verify JWT in onRequest hook", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-jwt"],
      jwtSecret: JWT_SECRET,
    });

    const token = createJwt({ sub: "user1" }, JWT_SECRET);
    const req = mockRequest({ headers: { authorization: `Bearer ${token}` } });
    const reply = mockReply();
    await fastify.hooks.onRequest[0](req, reply);
    expect((req as any).jwtPayload).to.have.property("sub", "user1");
    expect(reply._sent).to.equal(false);
  });

  it("should return error on invalid JWT in onRequest hook", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-jwt"],
      jwtSecret: JWT_SECRET,
    });

    const req = mockRequest({ headers: { authorization: "Bearer bad.token.sig" } });
    const reply = mockReply();
    await fastify.hooks.onRequest[0](req, reply);
    expect(reply._sent).to.equal(true);
    expect(reply._statusCode).to.equal(401);
  });

  it("should handle missing authorization header (falls back to empty string)", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-jwt"],
      jwtSecret: JWT_SECRET,
    });

    // No authorization header at all -> authHeader = undefined ?? "" = ""
    // Then token = "" since "" doesn't start with "Bearer "
    const req = mockRequest({ headers: {} });
    const reply = mockReply();
    await fastify.hooks.onRequest[0](req, reply);
    expect(reply._sent).to.equal(true);
    expect(reply._statusCode).to.equal(401);
    expect((reply._body as any).code).to.equal("MISSING_TOKEN");
  });

  it("should handle auth header without Bearer prefix (token becomes empty)", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-jwt"],
      jwtSecret: JWT_SECRET,
    });

    // Auth header present but not "Bearer " prefix -> token = ""
    const req = mockRequest({ headers: { authorization: "Basic abc123" } });
    const reply = mockReply();
    await fastify.hooks.onRequest[0](req, reply);
    expect(reply._sent).to.equal(true);
    expect(reply._statusCode).to.equal(401);
    expect((reply._body as any).code).to.equal("MISSING_TOKEN");
  });

  it("should return 500 when verify-jwt lacks jwtSecret", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-jwt"],
    });

    const req = mockRequest({ headers: { authorization: "Bearer a.b.c" } });
    const reply = mockReply();
    await fastify.hooks.onRequest[0](req, reply);
    expect(reply._sent).to.equal(true);
    expect(reply._statusCode).to.equal(500);
    expect((reply._body as any).code).to.equal("MISSING_CONFIG");
  });

  // --- onRequest: verify-signature ---

  it("should verify HMAC signature in onRequest hook", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-signature"],
      hmacKey: HMAC_KEY,
    });

    const body = '{"event":"push"}';
    const keyBuf = Buffer.from(HMAC_KEY, "hex");
    const sig = crypto.createHmac("sha256", keyBuf).update(body).digest("hex");
    const req = mockRequest({
      headers: { "x-signature": sig },
      body,
    });
    const reply = mockReply();
    await fastify.hooks.onRequest[0](req, reply);
    expect(reply._sent).to.equal(false);
  });

  it("should JSON-stringify non-string body for HMAC verification", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-signature"],
      hmacKey: HMAC_KEY,
    });

    const bodyObj = { event: "push" };
    const bodyStr = JSON.stringify(bodyObj);
    const keyBuf = Buffer.from(HMAC_KEY, "hex");
    const sig = crypto.createHmac("sha256", keyBuf).update(bodyStr).digest("hex");
    const req = mockRequest({
      headers: { "x-signature": sig },
      body: bodyObj,
    });
    const reply = mockReply();
    await fastify.hooks.onRequest[0](req, reply);
    expect(reply._sent).to.equal(false);
  });

  it("should return error on invalid HMAC signature in onRequest hook", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-signature"],
      hmacKey: HMAC_KEY,
    });

    // Use valid hex that is simply the wrong HMAC value (64 hex chars = 32 bytes)
    const req = mockRequest({
      headers: { "x-signature": "aa".repeat(32) },
      body: "body",
    });
    const reply = mockReply();
    await fastify.hooks.onRequest[0](req, reply);
    expect(reply._sent).to.equal(true);
    expect(reply._statusCode).to.equal(401);
  });

  it("should verify HMAC signature from x-hub-signature-256 header", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-signature"],
      hmacKey: HMAC_KEY,
    });

    const body = '{"event":"push"}';
    const keyBuf = Buffer.from(HMAC_KEY, "hex");
    const sig = crypto.createHmac("sha256", keyBuf).update(body).digest("hex");
    // Only x-hub-signature-256, no x-signature (tests the ?? fallback to second header)
    const req = mockRequest({
      headers: { "x-hub-signature-256": `sha256=${sig}` },
      body,
    });
    const reply = mockReply();
    await fastify.hooks.onRequest[0](req, reply);
    expect(reply._sent).to.equal(false);
  });

  it("should return MISSING_SIGNATURE when no signature headers present", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-signature"],
      hmacKey: HMAC_KEY,
    });

    // No x-signature or x-hub-signature-256 -> falls through to "" -> MISSING_SIGNATURE
    const req = mockRequest({
      headers: {},
      body: "body",
    });
    const reply = mockReply();
    await fastify.hooks.onRequest[0](req, reply);
    expect(reply._sent).to.equal(true);
    expect(reply._statusCode).to.equal(401);
    expect((reply._body as any).code).to.equal("MISSING_SIGNATURE");
  });

  it("should return 500 when verify-signature lacks hmacKey", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-signature"],
    });

    const req = mockRequest({
      headers: { "x-signature": "abc" },
      body: "body",
    });
    const reply = mockReply();
    await fastify.hooks.onRequest[0](req, reply);
    expect(reply._sent).to.equal(true);
    expect(reply._statusCode).to.equal(500);
    expect((reply._body as any).code).to.equal("MISSING_CONFIG");
  });

  // --- onRequest: route mismatch ---

  it("should skip onRequest processing when route does not match", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-jwt"],
      jwtSecret: JWT_SECRET,
      routes: ["/api/secret"],
    });

    const req = mockRequest({ url: "/api/public" });
    const reply = mockReply();
    await fastify.hooks.onRequest[0](req, reply);
    // Should not have set jwtPayload or sent an error
    expect((req as any).jwtPayload).to.be.undefined;
    expect(reply._sent).to.equal(false);
  });

  // --- onRequest: non-CryptoMiddlewareError re-thrown ---

  it("should re-throw non-CryptoMiddlewareError from onRequest (e.g. invalid hex in signature)", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["verify-signature"],
      hmacKey: HMAC_KEY,
    });

    // Pass non-hex signature so crypto-lib's verifyHmac throws a raw Error ("Invalid hex string")
    const req = mockRequest({
      headers: { "x-signature": "not-hex-at-all!" },
      body: "body",
    });
    const reply = mockReply();
    try {
      await fastify.hooks.onRequest[0](req, reply);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).to.not.be.instanceOf(CryptoMiddlewareError);
      expect(err).to.be.instanceOf(Error);
    }
  });

  // --- preHandler: decrypt-request ---

  it("should decrypt request body in preHandler hook", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["decrypt-request"],
      key: TEST_KEY,
    });

    const original = { message: "hello" };
    const sealed = encryptPayload(TEST_KEY, original);
    const req = mockRequest({ body: { encrypted: sealed } });
    const reply = mockReply();
    await fastify.hooks.preHandler[0](req, reply);
    expect(req.body).to.deep.equal(original);
  });

  it("should skip preHandler decryption when body has no encrypted field", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["decrypt-request"],
      key: TEST_KEY,
    });

    const req = mockRequest({ body: { plain: "data" } });
    const reply = mockReply();
    await fastify.hooks.preHandler[0](req, reply);
    expect(req.body).to.deep.equal({ plain: "data" });
  });

  it("should skip preHandler decryption when body is undefined", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["decrypt-request"],
      key: TEST_KEY,
    });

    const req = mockRequest({ body: undefined });
    const reply = mockReply();
    await fastify.hooks.preHandler[0](req, reply);
    expect(req.body).to.be.undefined;
  });

  it("should return 500 in preHandler when key is missing", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["decrypt-request"],
    });

    const req = mockRequest({ body: { encrypted: "something" } });
    const reply = mockReply();
    await fastify.hooks.preHandler[0](req, reply);
    expect(reply._sent).to.equal(true);
    expect(reply._statusCode).to.equal(500);
    expect((reply._body as any).code).to.equal("MISSING_CONFIG");
  });

  it("should return error in preHandler for invalid encrypted data", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["decrypt-request"],
      key: TEST_KEY,
    });

    const req = mockRequest({ body: { encrypted: "garbage" } });
    const reply = mockReply();
    await fastify.hooks.preHandler[0](req, reply);
    expect(reply._sent).to.equal(true);
    expect(reply._statusCode).to.equal(400);
    expect((reply._body as any).code).to.equal("DECRYPTION_FAILED");
  });

  it("should re-throw non-CryptoMiddlewareError from preHandler", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["decrypt-request"],
      key: TEST_KEY,
    });

    // Use a getter that throws a plain Error when 'encrypted' property is read
    let accessCount = 0;
    const trickBody = {
      get encrypted(): string {
        accessCount++;
        // The 'in' operator check doesn't call the getter, but property access does
        throw new Error("unexpected getter error");
      },
    };
    // Ensure 'encrypted' is detected by the 'in' operator
    expect("encrypted" in trickBody).to.equal(true);

    const req = mockRequest({ body: trickBody });
    const reply = mockReply();
    try {
      await fastify.hooks.preHandler[0](req, reply);
      expect.fail("should have thrown");
    } catch (err) {
      // The getter throws a plain Error, which is NOT a CryptoMiddlewareError,
      // so it hits the `throw err` branch (lines 136-137)
      expect(err).to.not.be.instanceOf(CryptoMiddlewareError);
      expect((err as Error).message).to.equal("unexpected getter error");
    }
  });

  it("should skip preHandler when route does not match", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["decrypt-request"],
      key: TEST_KEY,
      routes: ["/api/secret"],
    });

    const sealed = encryptPayload(TEST_KEY, { a: 1 });
    const req = mockRequest({ url: "/api/public", body: { encrypted: sealed } });
    const reply = mockReply();
    await fastify.hooks.preHandler[0](req, reply);
    // Body should not be decrypted
    expect(req.body).to.deep.equal({ encrypted: sealed });
  });

  // --- preSerialization: encrypt-response ---

  it("should encrypt response payload in preSerialization hook", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["encrypt-response"],
      key: TEST_KEY,
    });

    const req = mockRequest();
    const reply = mockReply();
    const result = await fastify.hooks.preSerialization[0](req, reply, { data: "secret" });
    expect(result).to.have.property("encrypted");
    const decrypted = decryptPayload(TEST_KEY, (result as any).encrypted);
    expect(decrypted).to.deep.equal({ data: "secret" });
  });

  it("should not encrypt non-object payload in preSerialization", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["encrypt-response"],
      key: TEST_KEY,
    });

    const req = mockRequest();
    const reply = mockReply();
    const result = await fastify.hooks.preSerialization[0](req, reply, "string payload");
    expect(result).to.equal("string payload");
  });

  it("should not encrypt null payload in preSerialization", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["encrypt-response"],
      key: TEST_KEY,
    });

    const req = mockRequest();
    const reply = mockReply();
    const result = await fastify.hooks.preSerialization[0](req, reply, null);
    expect(result).to.equal(null);
  });

  it("should return payload unencrypted when key is missing in preSerialization", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["encrypt-response"],
    });

    const req = mockRequest();
    const reply = mockReply();
    const payload = { data: "test" };
    const result = await fastify.hooks.preSerialization[0](req, reply, payload);
    expect(result).to.equal(payload);
  });

  it("should skip preSerialization when route does not match", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["encrypt-response"],
      key: TEST_KEY,
      routes: ["/api/secret"],
    });

    const req = mockRequest({ url: "/api/public" });
    const reply = mockReply();
    const payload = { data: "test" };
    const result = await fastify.hooks.preSerialization[0](req, reply, payload);
    expect(result).to.equal(payload);
  });

  it("should encrypt array payload in preSerialization", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {
      operations: ["encrypt-response"],
      key: TEST_KEY,
    });

    const req = mockRequest();
    const reply = mockReply();
    const result = await fastify.hooks.preSerialization[0](req, reply, [1, 2, 3]);
    expect(result).to.have.property("encrypted");
    const decrypted = decryptPayload(TEST_KEY, (result as any).encrypted);
    expect(decrypted).to.deep.equal([1, 2, 3]);
  });

  // --- Default operations (empty) ---

  it("should only register onRequest with no decrypt/encrypt operations", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {});
    expect(fastify.hooks).to.have.property("onRequest");
    expect(fastify.hooks).to.not.have.property("preHandler");
    expect(fastify.hooks).to.not.have.property("preSerialization");
  });

  it("should be a no-op onRequest hook when no operations configured", async () => {
    const fastify = mockFastify();
    await cryptoPlugin(fastify, {});
    const req = mockRequest();
    const reply = mockReply();
    await fastify.hooks.onRequest[0](req, reply);
    expect(reply._sent).to.equal(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Barrel exports (index.ts)
// ---------------------------------------------------------------------------

describe("barrel exports (index.ts)", () => {
  it("should export CryptoMiddlewareError", () => {
    expect(barrel.CryptoMiddlewareError).to.be.a("function");
  });

  it("should export encryptPayload", () => {
    expect(barrel.encryptPayload).to.be.a("function");
  });

  it("should export decryptPayload", () => {
    expect(barrel.decryptPayload).to.be.a("function");
  });

  it("should export verifyHmacSignature", () => {
    expect(barrel.verifyHmacSignature).to.be.a("function");
  });

  it("should export verifyJwt", () => {
    expect(barrel.verifyJwt).to.be.a("function");
  });

  it("should export matchRoute", () => {
    expect(barrel.matchRoute).to.be.a("function");
  });

  it("should export createCryptoMiddleware", () => {
    expect(barrel.createCryptoMiddleware).to.be.a("function");
  });

  it("should export cryptoPlugin", () => {
    expect(barrel.cryptoPlugin).to.be.a("function");
  });
});
