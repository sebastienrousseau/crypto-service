/**
 * RFC 9457 problem details for every error response.
 *
 * Before this change error bodies came in several shapes ({ error },
 * { error, details }, { error, message }, Fastify's { statusCode, error,
 * message } and the rate limiter's own), all as application/json, and an
 * unexpected error could carry its internal message to the client.
 */
import { expect } from "chai";
import fastify from "fastify";
import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { CryptoError } from "@sebastienrousseau/crypto-lib";
import { init } from "../src/server";
import { KeyStoreError } from "../src/lib/key-store";
import {
  PROBLEM_TYPE_PREFIX,
  classifyThrown,
  registerProblemHandlers,
} from "../src/lib/problem";

/** Run `fn` with env overrides, restoring the previous values after. */
async function withEnv<T>(
  vars: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const saved = Object.fromEntries(
    Object.keys(vars).map((k) => [k, process.env[k]]),
  );
  const apply = (v: Record<string, string | undefined>): void => {
    for (const [k, val] of Object.entries(v)) {
      if (val === undefined) delete process.env[k];
      else process.env[k] = val;
    }
  };
  apply(vars);
  try {
    return await fn();
  } finally {
    apply(saved);
  }
}

/** The response body, after checking the problem+json media type. */
function problemOf(res: LightMyRequestResponse): Record<string, unknown> {
  expect(res.headers["content-type"]).to.match(/^application\/problem\+json/);
  return res.json();
}

const type = (slug: string): string => `${PROBLEM_TYPE_PREFIX}${slug}`;

describe("Problem details (RFC 9457)", function () {
  this.timeout(30000);

  describe("anonymous server", () => {
    let app: FastifyInstance;
    before(async () => {
      app = await init();
    });
    after(async () => {
      await app.close();
    });

    it("400 for a body that fails its schema", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hash",
        payload: { data: "x" },
      });
      expect(res.statusCode).to.equal(400);
      expect(problemOf(res)).to.deep.equal({
        type: type("validation-failed"),
        title: "Validation failed",
        status: 400,
        detail: "body must have required property 'algorithm'",
        instance: "/v2/hash",
        errors: [
          {
            field: "/algorithm",
            message: "must have required property 'algorithm'",
          },
        ],
      });
    });

    it("400 for a field that fails a route's own validation", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/encrypt",
        payload: { passphrase: "p", message: "m", publicKey: "not!b64" },
      });
      expect(problemOf(res)).to.deep.equal({
        type: type("validation-failed"),
        title: "Validation failed",
        status: 400,
        detail: "Validation failed",
        instance: "/v1/encrypt",
        errors: [
          {
            field: "publicKey",
            message: "publicKey must be valid base64 encoded data",
          },
        ],
      });
    });

    it("400 for input crypto-lib rejects", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/encrypt",
        payload: { key: "zz".repeat(32), plaintext: "x" },
      });
      expect(problemOf(res)).to.deep.equal({
        type: type("invalid-input"),
        title: "Invalid input",
        status: 400,
        detail: "Encryption failed: invalid input",
        instance: "/v2/encrypt",
      });
    });

    it("400 for a body that is not JSON", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hash",
        headers: { "content-type": "application/json" },
        payload: "{not json",
      });
      const body = problemOf(res);
      expect(body.type).to.equal(type("request-error"));
      expect(body.status).to.equal(400);
    });

    it("413 for a body over the size limit", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/hash",
        payload: { algorithm: "sha256", data: "x".repeat(300 * 1024) },
      });
      const body = problemOf(res);
      expect(body.type).to.equal(type("payload-too-large"));
      expect(body.status).to.equal(413);
    });

    it("404 for an unknown route, without echoing the query string", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/nope?token=secret",
      });
      expect(problemOf(res)).to.deep.equal({
        type: type("not-found"),
        title: "Not Found",
        status: 404,
        detail: "Route GET /nope not found",
        instance: "/nope",
      });
      expect(res.payload).to.not.include("secret");
    });

    it("404 with a code for an unknown keyId", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v2/sign",
        payload: { keyId: `k_${"A".repeat(22)}`, message: "m" },
      });
      expect(problemOf(res)).to.deep.equal({
        type: type("key-not-found"),
        title: "Key not found",
        status: 404,
        detail: "Key not found",
        instance: "/v2/sign",
        code: "KEY_NOT_FOUND",
      });
    });

    it("500 from a v1 route hides the cause", async () => {
      const bad = Buffer.from("not-a-pgp-key").toString("base64");
      const res = await app.inject({
        method: "POST",
        url: "/v1/encrypt",
        payload: { passphrase: "p", message: "m", publicKey: bad },
      });
      expect(problemOf(res)).to.deep.equal({
        type: type("internal-error"),
        title: "Internal Server Error",
        status: 500,
        detail: "Encryption failed",
        instance: "/v1/encrypt",
      });
    });
  });

  describe("authenticated server", () => {
    const JWT_ONLY = {
      JWT_SECRET: "p".repeat(32),
      CRYPTO_API_KEY: undefined,
      ALLOW_ANONYMOUS: undefined,
    };

    it("401 without credentials and 403 without the scope", async () => {
      await withEnv(JWT_ONLY, async () => {
        const app = await init();
        try {
          const anon = await app.inject({
            method: "POST",
            url: "/v2/hash",
            payload: { algorithm: "sha256", data: "x" },
          });
          expect(problemOf(anon)).to.deep.equal({
            type: type("unauthorized"),
            title: "Unauthorized",
            status: 401,
            detail: "No valid credentials provided",
            instance: "/v2/hash",
          });

          const token = (
            app as unknown as {
              jwt: { sign: (p: object, o: object) => string };
            }
          ).jwt.sign(
            { sub: "u", scopes: ["crypto:hash"] },
            { expiresIn: "1h" },
          );
          const denied = await app.inject({
            method: "POST",
            url: "/v2/encrypt",
            headers: { authorization: `Bearer ${token}` },
            payload: { key: "00".repeat(32), plaintext: "x" },
          });
          expect(problemOf(denied)).to.deep.equal({
            type: type("forbidden"),
            title: "Forbidden",
            status: 403,
            detail: "Missing required scope: crypto:encrypt",
            instance: "/v2/encrypt",
          });
        } finally {
          await app.close();
        }
      });
    });
  });

  describe("error handler", () => {
    let app: FastifyInstance;
    before(async () => {
      app = fastify({ logger: false });
      registerProblemHandlers(app);
      app.get("/boom", async () => {
        throw new Error("secret internal detail at /srv/app.js:42");
      });
      app.get("/crypto-input", async () => {
        throw new CryptoError("bad key", "INVALID_KEY");
      });
      app.get("/crypto-internal", async () => {
        throw new CryptoError("destroyed", "BUFFER_DESTROYED");
      });
      app.get("/store-full", async () => {
        throw new KeyStoreError("Key store is full", 503, "KEY_STORE_FULL");
      });
      await app.ready();
    });
    after(async () => {
      await app.close();
    });

    it("500 for an unexpected error, with no message or stack", async () => {
      const res = await app.inject({ method: "GET", url: "/boom" });
      expect(problemOf(res)).to.deep.equal({
        type: type("internal-error"),
        title: "Internal Server Error",
        status: 500,
        detail: "An unexpected error occurred",
        instance: "/boom",
      });
      expect(res.payload).to.not.include("secret");
      expect(res.payload).to.not.include("app.js");
    });

    it("maps a crypto-lib CryptoError by its code", async () => {
      const input = await app.inject({ method: "GET", url: "/crypto-input" });
      expect(problemOf(input)).to.deep.equal({
        type: type("invalid-input"),
        title: "Invalid input",
        status: 400,
        detail: "Invalid input",
        instance: "/crypto-input",
        code: "INVALID_KEY",
      });
      const internal = await app.inject({
        method: "GET",
        url: "/crypto-internal",
      });
      expect(problemOf(internal)).to.deep.equal({
        type: type("internal-error"),
        title: "Internal Server Error",
        status: 500,
        detail: "An unexpected error occurred",
        instance: "/crypto-internal",
        code: "BUFFER_DESTROYED",
      });
    });

    it("503 for a full key store", async () => {
      const res = await app.inject({ method: "GET", url: "/store-full" });
      expect(problemOf(res)).to.deep.equal({
        type: type("key-store-full"),
        title: "Key store full",
        status: 503,
        detail: "Key store is full",
        instance: "/store-full",
        code: "KEY_STORE_FULL",
      });
    });

    it("classifyThrown covers the remaining shapes", () => {
      expect(classifyThrown(null).status).to.equal(500);
      expect(classifyThrown({ statusCode: 418 })).to.deep.equal({
        status: 418,
        slug: "request-error",
        detail: "I'm a Teapot",
        extensions: {},
      });
      expect(
        classifyThrown(new KeyStoreError("odd", 409, "OTHER")).slug,
      ).to.equal("request-error");
      expect(
        classifyThrown({
          message: "querystring/x is invalid",
          validation: [{ instancePath: "/x", params: {} }],
        }).extensions,
      ).to.deep.equal({ errors: [{ field: "/x", message: "is invalid" }] });
    });
  });
});
