/**
 * Per-route authorization (audit finding F05).
 *
 * Before this policy existed, `requireScope()` was never called: any
 * authenticated principal could call any route whatever its scopes.
 */
import { expect } from "chai";
import fastify from "fastify";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import routes from "../src/routes";
import { init } from "../src/server";
import { authorizeRoute, SCOPES, type AuthPayload } from "../src/lib/auth";
import {
  AUTHENTICATED,
  ROUTE_SCOPES,
  assertRoutesCovered,
  isPublicRoute,
  routeRequirement,
  unmappedRoutes,
  type RegisteredRoute,
} from "../src/config/auth-policy";

/** Every route the application registers, as `onRoute` reports it. */
async function registeredRoutes(): Promise<RegisteredRoute[]> {
  const app = fastify();
  const seen: RegisteredRoute[] = [];
  app.addHook("onRoute", (r) => {
    seen.push({ method: r.method, url: r.url });
  });
  await app.register(async (scope) => {
    routes(scope);
  });
  await app.ready();
  await app.close();
  return seen;
}

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

const JWT_ONLY = {
  JWT_SECRET: "s".repeat(32),
  CRYPTO_API_KEY: undefined,
  ALLOW_ANONYMOUS: undefined,
};

/** Sign a token with the app's own @fastify/jwt signer. */
function sign(app: FastifyInstance, scopes: unknown): string {
  return (app as unknown as { jwt: { sign: (p: object) => string } }).jwt.sign({
    sub: "svc",
    scopes,
  });
}

describe("Route authorization policy (F05)", function () {
  this.timeout(30000);

  describe("coverage", () => {
    it("maps every registered non-public route to a requirement", async () => {
      const all = await registeredRoutes();
      expect(all.length).to.be.greaterThan(40);
      expect(unmappedRoutes(all)).to.deep.equal([]);
    });

    it("has no stale entries: every policy key is a registered route", async () => {
      const app = await init();
      try {
        // "OPTIONS *" is the @fastify/cors preflight route, registered in
        // the plugin's own scope, where hasRoute() cannot see it.
        const keys = Object.keys(ROUTE_SCOPES).filter((k) => k !== "OPTIONS *");
        for (const key of keys) {
          const [method, url] = key.split(" ") as [string, string];
          expect(app.hasRoute({ method: method as "GET", url }), key).to.equal(
            true,
          );
        }
      } finally {
        await app.close();
      }
    });

    it("only uses known scopes or the authenticated marker", () => {
      for (const [key, value] of Object.entries(ROUTE_SCOPES)) {
        const known = (SCOPES as readonly string[]).includes(value);
        expect(known || value === AUTHENTICATED, key).to.equal(true);
      }
    });

    it("reports unmapped routes, per method", () => {
      expect(
        unmappedRoutes([
          { method: ["GET", "POST"], url: "/v2/new" },
          { method: "GET", url: "/live" },
          { method: "GET", url: "/docs/json" },
          { method: "HEAD", url: "/v2/algorithms" },
        ]),
      ).to.deep.equal(["GET /v2/new", "POST /v2/new"]);
    });

    it("treats HEAD like GET and leaves unknown routes undefined", () => {
      expect(routeRequirement("HEAD", "/")).to.equal(AUTHENTICATED);
      expect(routeRequirement("POST", "/nope")).to.equal(undefined);
      expect(isPublicRoute("/health?x=1")).to.equal(true);
      expect(isPublicRoute("/v2/hash")).to.equal(false);
    });

    it("throws at boot when a route has no policy entry", () => {
      expect(() =>
        assertRoutesCovered([{ method: "POST", url: "/x" }]),
      ).to.throw("Routes without an authorization policy: POST /x");
      expect(() =>
        assertRoutesCovered([{ method: "POST", url: "/v2/hash" }]),
      ).to.not.throw();
    });

    it("boots the real server, so its own routes are all covered", async () => {
      const app = await init();
      await app.close();
    });
  });

  describe("authorizeRoute (unit)", () => {
    /** A mock reply that records the status and body sent. */
    function mockReply() {
      const state = { code: 0, body: undefined as unknown };
      const reply = {
        status(code: number) {
          state.code = code;
          return {
            send(body: unknown) {
              state.body = body;
            },
          };
        },
      } as unknown as FastifyReply;
      return { reply, state };
    }

    const req = (method: string, url: string | undefined): FastifyRequest =>
      ({ method, routeOptions: { url } }) as unknown as FastifyRequest;
    const limited: AuthPayload = { sub: "u", scopes: ["crypto:hash"] };

    it("passes requests that matched no route (404 handler answers)", () => {
      const { reply, state } = mockReply();
      expect(authorizeRoute(req("POST", undefined), reply, limited)).to.equal(
        true,
      );
      expect(state.code).to.equal(0);
    });

    it("denies a registered route with no policy entry (fail closed)", () => {
      const { reply, state } = mockReply();
      expect(
        authorizeRoute(req("POST", "/unmapped"), reply, {
          sub: "a",
          scopes: ["crypto:admin"],
        }),
      ).to.equal(false);
      expect(state.code).to.equal(403);
    });

    it("lets any principal call an authenticated-only route", () => {
      const { reply } = mockReply();
      expect(
        authorizeRoute(req("GET", "/v2/algorithms"), reply, {
          sub: "u",
          scopes: [],
        }),
      ).to.equal(true);
    });

    it("treats a token without a scopes array as having no scopes", () => {
      const { reply, state } = mockReply();
      const noScopes = { sub: "u" } as unknown as AuthPayload;
      expect(authorizeRoute(req("POST", "/v2/hash"), reply, noScopes)).to.equal(
        false,
      );
      expect(state.code).to.equal(403);
    });
  });

  describe("server", () => {
    it("returns 403 out of scope and 200 in scope for a limited JWT", async () => {
      await withEnv(JWT_ONLY, async () => {
        const app = await init();
        try {
          const token = sign(app, ["crypto:hash"]);
          const headers = { authorization: `Bearer ${token}` };
          const inScope = await app.inject({
            method: "POST",
            url: "/v2/hash",
            headers,
            payload: { algorithm: "sha256", data: "x" },
          });
          expect(inScope.statusCode).to.equal(200);

          const outOfScope = await app.inject({
            method: "POST",
            url: "/v2/encrypt",
            headers,
            payload: { key: "00".repeat(32), plaintext: "x" },
          });
          expect(outOfScope.statusCode).to.equal(403);
          expect(outOfScope.json().message).to.equal(
            "Missing required scope: crypto:encrypt",
          );

          const revoke = await app.inject({
            method: "POST",
            url: "/v1/revoke",
            headers,
            payload: { passphrase: "p", flag: 0, reason: "r" },
          });
          expect(revoke.statusCode).to.equal(403);
        } finally {
          await app.close();
        }
      });
    });

    it("lets crypto:admin call any route and any principal read metadata", async () => {
      await withEnv(JWT_ONLY, async () => {
        const app = await init();
        try {
          const admin = sign(app, ["crypto:admin"]);
          const res = await app.inject({
            method: "POST",
            url: "/v2/encrypt",
            headers: { authorization: `Bearer ${admin}` },
            payload: { key: "00".repeat(32), plaintext: "x" },
          });
          expect(res.statusCode).to.equal(200);

          const none = sign(app, []);
          const meta = await app.inject({
            method: "GET",
            url: "/v2/algorithms",
            headers: { authorization: `Bearer ${none}` },
          });
          expect(meta.statusCode).to.equal(200);
        } finally {
          await app.close();
        }
      });
    });

    it("answers 404 (not 403) for an authenticated request to no route", async () => {
      await withEnv(JWT_ONLY, async () => {
        const app = await init();
        try {
          const token = sign(app, ["crypto:hash"]);
          const res = await app.inject({
            method: "GET",
            url: "/v2/does-not-exist",
            headers: { authorization: `Bearer ${token}` },
          });
          expect(res.statusCode).to.equal(404);
        } finally {
          await app.close();
        }
      });
    });
  });
});
