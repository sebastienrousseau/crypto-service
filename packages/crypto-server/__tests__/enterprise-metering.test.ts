/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Tests for enterprise/metering.ts: per-tenant metering and rate limiting.
 */
import { expect } from "chai";
import Fastify from "fastify";
import {
  DEFAULT_MAX_TENANTS,
  MeteringEngine,
  TENANT_REQUESTS_PER_MINUTE,
  registerMetering,
} from "../src/enterprise/metering";

const MAX = TENANT_REQUESTS_PER_MINUTE;

describe("Tenant metering engine", () => {
  let engine: MeteringEngine;

  beforeEach(() => {
    engine = new MeteringEngine();
  });

  describe("Token bucket", () => {
    it("should allow requests and deduct tokens", () => {
      const start = 100000;
      const res1 = engine.checkRequest("tenant-a", 1024, start);
      expect(res1.allowed).to.be.true;
      expect(res1.limit).to.equal(MAX);
      expect(res1.remaining).to.equal(MAX - 1);

      const res2 = engine.checkRequest("tenant-a", undefined, start);
      expect(res2.allowed).to.be.true;
      expect(res2.remaining).to.equal(MAX - 2);
    });

    it("takes its quota from the constructor", () => {
      const custom = new MeteringEngine(10, 5);
      for (let i = 0; i < 5; i++) {
        expect(custom.checkRequest("t", undefined, 0).allowed).to.be.true;
      }
      const refused = custom.checkRequest("t", undefined, 0);
      expect(refused.allowed).to.be.false;
      expect(refused.limit).to.equal(5);
    });

    // The per-tier payload ceilings (1 to 50 MB) were above the server's
    // body limit, so they could never apply; a payload is only counted.
    it("does not refuse a large payload", () => {
      const res = engine.checkRequest("tenant-b", 100 * 1024 * 1024, 0);
      expect(res.allowed).to.be.true;
    });

    it("should refuse a request when tokens are exhausted", () => {
      const start = 100000;
      const tenant = "tenant-exhaust";
      for (let i = 0; i < MAX; i++) {
        expect(engine.checkRequest(tenant, 100, start).allowed).to.be.true;
      }

      const rejected = engine.checkRequest(tenant, 100, start);
      expect(rejected.allowed).to.be.false;
      expect(rejected.remaining).to.equal(0);
      expect(rejected.error).to.equal(
        `Tenant rate limit exceeded. Limit: ${MAX} req/min.`,
      );
    });

    it("should refill tokens over the window", () => {
      const start = 100000;
      const tenant = "tenant-refill";
      for (let i = 0; i < MAX; i++) {
        engine.checkRequest(tenant, 100, start);
      }
      expect(engine.checkRequest(tenant, 100, start).allowed).to.be.false;

      // Half a window refills half the bucket.
      const refilled = engine.checkRequest(tenant, 100, start + 30000);
      expect(refilled.allowed).to.be.true;
      expect(refilled.remaining).to.be.at.least(28);

      // A clock that goes backwards neither fails nor adds tokens.
      engine.checkRequest(tenant, 100, start + 25000);
    });

    it("should reset the tenant store when reset() is invoked", () => {
      engine.checkRequest("tenant-c", 100);
      engine.reset();
      expect(engine.size).to.equal(0);
      expect(engine.checkRequest("tenant-c", 100).remaining).to.equal(MAX - 1);
    });
  });

  describe("Bounded tenant store", () => {
    it("should default to DEFAULT_MAX_TENANTS", () => {
      for (let i = 0; i <= DEFAULT_MAX_TENANTS; i++) {
        engine.checkRequest(`t${i}`, undefined, 0);
      }
      expect(engine.size).to.equal(DEFAULT_MAX_TENANTS);
    });

    it("should never hold more than maxTenants entries", () => {
      const small = new MeteringEngine(3);
      for (let i = 0; i < 50; i++) {
        small.checkRequest(`attacker-${i}`, undefined, 0);
      }
      expect(small.size).to.equal(3);
    });

    it("should evict the least recently used tenant first", () => {
      const small = new MeteringEngine(2);
      small.checkRequest("a", undefined, 0);
      small.checkRequest("b", undefined, 0);
      // Touch "a" so "b" becomes the least recently used tenant.
      small.checkRequest("a", undefined, 0);
      small.checkRequest("c", undefined, 0);

      // "a" kept its bucket (3 tokens used); "b" was evicted (fresh bucket).
      expect(small.checkRequest("a", undefined, 0).remaining).to.equal(MAX - 3);
      expect(small.checkRequest("b", undefined, 0).remaining).to.equal(MAX - 1);
    });
  });

  describe("Fastify plugin", () => {
    let testApp: ReturnType<typeof Fastify>;

    beforeEach(async () => {
      testApp = Fastify();
      // Stand-in for the server's authentication hook: the principal comes
      // from trusted test headers, never from x-api-key.
      testApp.addHook("onRequest", async (request) => {
        const sub = request.headers["x-test-sub"];
        if (typeof sub === "string") {
          (request as { auth?: unknown }).auth = {
            sub,
            tier: request.headers["x-test-tier"],
          };
        }
      });
      registerMetering(testApp, engine);

      testApp.get("/live", async () => ({ status: "alive" }));
      testApp.get("/health", async () => ({ status: "ok" }));
      testApp.get("/docs", async () => ({ docs: true }));
      testApp.get("/docs/static", async () => ({ static: true }));
      testApp.get("/favicon.ico", async () => "ico");
      testApp.get("/v2/test-crypto", async () => ({ success: true }));

      await testApp.ready();
    });

    afterEach(async () => {
      await testApp.close();
    });

    it("should skip metering on probes and documentation routes", async () => {
      for (const url of ["/live", "/live?verbose=1", "/health"]) {
        const res = await testApp.inject({ method: "GET", url });
        expect(res.statusCode).to.equal(200);
        expect(res.headers["x-tenant-ratelimit-limit"]).to.be.undefined;
      }

      const docsRes = await testApp.inject({ method: "GET", url: "/docs" });
      expect(docsRes.statusCode).to.equal(200);

      const favRes = await testApp.inject({
        method: "GET",
        url: "/favicon.ico",
      });
      expect(favRes.statusCode).to.equal(200);
      expect(engine.size).to.equal(0);
    });

    // Tier quotas are removed for now: a `tier` claim no longer changes
    // the limit, and no license tier is reported.
    it("gives every tenant the same quota, whatever its tier claim", async () => {
      const res = await testApp.inject({
        method: "GET",
        url: "/v2/test-crypto",
        headers: { "x-test-sub": "tenant-claims", "x-test-tier": "sovereign" },
      });
      expect(res.statusCode).to.equal(200);
      expect(res.headers["x-tenant-ratelimit-limit"]).to.equal("60");
      expect(res.headers["x-license-tier"]).to.be.undefined;
    });

    it("reports the tenant quota in X-Tenant-RateLimit-*", async () => {
      const res = await testApp.inject({
        method: "GET",
        url: "/v2/test-crypto",
        headers: { "x-test-sub": "tenant-a", "content-length": "256" },
      });

      expect(res.statusCode).to.equal(200);
      expect(res.headers["x-tenant-ratelimit-limit"]).to.equal("60");
      expect(res.headers["x-tenant-ratelimit-remaining"]).to.equal("59");
      expect(res.headers["x-tenant-ratelimit-reset"]).to.exist;
      // X-RateLimit-* belongs to the global limiter, not to metering.
      expect(res.headers["x-ratelimit-limit"]).to.be.undefined;
    });

    it("should key tenants on the authenticated subject only", async () => {
      for (const key of ["k1", "k2", "k3"]) {
        await testApp.inject({
          method: "GET",
          url: "/v2/test-crypto",
          headers: { "x-api-key": key },
        });
      }
      // Varying an unauthenticated header must not create tenants.
      expect(engine.size).to.equal(1);
    });

    it("should handle an invalid content-length header safely", async () => {
      const res = await testApp.inject({
        method: "GET",
        url: "/v2/test-crypto",
        headers: { "content-length": "not-a-number" },
      });
      expect(res.statusCode).to.equal(200);
    });

    it("should respond with 429 when the tenant quota is exhausted", async () => {
      const headers = { "x-test-sub": "tenant-exhaust" };
      for (let i = 0; i < MAX; i++) {
        await testApp.inject({
          method: "GET",
          url: "/v2/test-crypto",
          headers,
        });
      }

      const res = await testApp.inject({
        method: "GET",
        url: "/v2/test-crypto",
        headers,
      });

      expect(res.statusCode).to.equal(429);
      expect(res.headers["retry-after"]).to.exist;
      expect(res.headers["content-type"]).to.include(
        "application/problem+json",
      );
      const json = JSON.parse(res.payload);
      expect(json.status).to.equal(429);
      expect(json.title).to.equal("Too Many Requests");
      expect(json.limit).to.equal(MAX);
      expect(json).to.not.have.property("tier");
    });
  });
});
