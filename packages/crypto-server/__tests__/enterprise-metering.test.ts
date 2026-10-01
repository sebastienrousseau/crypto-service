/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Tests for enterprise/metering.ts — Multi-tenant Sovereign CaaS metering and rate-limiting engine.
 */
import { expect } from "chai";
import Fastify from "fastify";
import {
  DEFAULT_MAX_TENANTS,
  MeteringEngine,
  TIER_QUOTAS,
  registerMetering,
} from "../src/enterprise/metering";

describe("Enterprise CaaS Metering Engine", () => {
  let engine: MeteringEngine;

  beforeEach(() => {
    engine = new MeteringEngine();
  });

  describe("Tier Resolution", () => {
    it("should resolve a missing or unknown claim to community tier", () => {
      expect(engine.resolveTier(undefined)).to.equal("community");
      expect(engine.resolveTier("")).to.equal("community");
      expect(engine.resolveTier("platinum")).to.equal("community");
      expect(engine.resolveTier("toString")).to.equal("community");
      expect(engine.resolveTier(42)).to.equal("community");
    });

    it("should not derive a tier from an API key prefix", () => {
      expect(engine.resolveTier("sk_sovereign_xyz789")).to.equal("community");
      expect(engine.resolveTier("sk_enterprise_abc")).to.equal("community");
    });

    it("should accept a known tier claim", () => {
      expect(engine.resolveTier("enterprise")).to.equal("enterprise");
      expect(engine.resolveTier("sovereign")).to.equal("sovereign");
    });
  });

  describe("Token Bucket & Quota Evaluation", () => {
    it("should allow request and deduct tokens properly", () => {
      const start = 100000;
      const res1 = engine.checkRequest("tenant-a", "enterprise", 1024, start);
      expect(res1.allowed).to.be.true;
      expect(res1.tier).to.equal("enterprise");
      expect(res1.limit).to.equal(TIER_QUOTAS.enterprise.maxRequestsPerMinute);
      expect(res1.remaining).to.equal(
        TIER_QUOTAS.enterprise.maxRequestsPerMinute - 1,
      );

      // Check request without contentLength
      const res2 = engine.checkRequest(
        "tenant-a",
        "enterprise",
        undefined,
        start,
      );
      expect(res2.allowed).to.be.true;
      expect(res2.remaining).to.equal(
        TIER_QUOTAS.enterprise.maxRequestsPerMinute - 2,
      );
    });

    it("should reject request exceeding max payload size with 413", () => {
      const start = 100000;
      const oversizedPayload = TIER_QUOTAS.community.maxBytesPerPayload + 1024;
      const res = engine.checkRequest(
        "tenant-b",
        "community",
        oversizedPayload,
        start,
      );
      expect(res.allowed).to.be.false;
      expect(res.statusCode).to.equal(413);
      expect(res.error).to.include("Payload size");
    });

    it("should reject request when tokens are exhausted with 429", () => {
      const start = 100000;
      const tenant = "tenant-exhaust";
      // Exhaust tokens
      for (let i = 0; i < TIER_QUOTAS.community.maxRequestsPerMinute; i++) {
        const check = engine.checkRequest(tenant, "community", 100, start);
        expect(check.allowed).to.be.true;
      }

      // Next request must be rejected
      const rejected = engine.checkRequest(tenant, "community", 100, start);
      expect(rejected.allowed).to.be.false;
      expect(rejected.statusCode).to.equal(429);
      expect(rejected.remaining).to.equal(0);
      expect(rejected.error).to.include("Tenant rate limit exceeded");
    });

    it("should refill tokens over elapsed time window", () => {
      const start = 100000;
      const tenant = "tenant-refill";
      // Exhaust all 60 tokens
      for (let i = 0; i < 60; i++) {
        engine.checkRequest(tenant, "community", 100, start);
      }
      expect(engine.checkRequest(tenant, "community", 100, start).allowed).to.be
        .false;

      // Advance clock by 30 seconds (half window = 30 tokens refilled)
      const halfWindow = start + 30000;
      const refilledCheck = engine.checkRequest(
        tenant,
        "community",
        100,
        halfWindow,
      );
      expect(refilledCheck.allowed).to.be.true;
      expect(refilledCheck.remaining).to.be.at.least(28);

      // Check non-positive elapsedMs does not fail or alter tokens
      engine.checkRequest(tenant, "community", 100, halfWindow - 5000);
    });

    it("should reset tenant store when reset() is invoked", () => {
      engine.checkRequest("tenant-c", "sovereign", 100);
      engine.reset();
      expect(engine.size).to.equal(0);
      const fresh = engine.checkRequest("tenant-c", "sovereign", 100);
      expect(fresh.remaining).to.equal(
        TIER_QUOTAS.sovereign.maxRequestsPerMinute - 1,
      );
    });
  });

  describe("Bounded tenant store", () => {
    it("should default to DEFAULT_MAX_TENANTS", () => {
      for (let i = 0; i <= DEFAULT_MAX_TENANTS; i++) {
        engine.checkRequest(`t${i}`, "community", undefined, 0);
      }
      expect(engine.size).to.equal(DEFAULT_MAX_TENANTS);
    });

    it("should never hold more than maxTenants entries", () => {
      const small = new MeteringEngine(3);
      for (let i = 0; i < 50; i++) {
        small.checkRequest(`attacker-${i}`, "community", undefined, 0);
      }
      expect(small.size).to.equal(3);
    });

    it("should evict the least recently used tenant first", () => {
      const small = new MeteringEngine(2);
      const max = TIER_QUOTAS.community.maxRequestsPerMinute;
      small.checkRequest("a", "community", undefined, 0);
      small.checkRequest("b", "community", undefined, 0);
      // Touch "a" so "b" becomes the least recently used tenant.
      small.checkRequest("a", "community", undefined, 0);
      small.checkRequest("c", "community", undefined, 0);

      // "a" kept its bucket (3 tokens used); "b" was evicted (fresh bucket).
      expect(
        small.checkRequest("a", "community", undefined, 0).remaining,
      ).to.equal(max - 3);
      expect(
        small.checkRequest("b", "community", undefined, 0).remaining,
      ).to.equal(max - 1);
    });
  });

  describe("Fastify Plugin Integration", () => {
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
        expect(res.headers["x-license-tier"]).to.be.undefined;
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

    it("should take the tier from the authenticated principal", async () => {
      const res = await testApp.inject({
        method: "GET",
        url: "/v2/test-crypto",
        headers: {
          "x-test-sub": "tenant-ent",
          "x-test-tier": "enterprise",
          "content-length": "256",
        },
      });

      expect(res.statusCode).to.equal(200);
      expect(res.headers["x-license-tier"]).to.equal("enterprise");
      expect(res.headers["x-tenant-ratelimit-limit"]).to.equal("1000");
      expect(res.headers["x-tenant-ratelimit-remaining"]).to.equal("999");
      expect(res.headers["x-tenant-ratelimit-reset"]).to.exist;
      // X-RateLimit-* belongs to the global limiter, not to metering.
      expect(res.headers["x-ratelimit-limit"]).to.be.undefined;
    });

    it("should ignore a forged API key prefix", async () => {
      const res = await testApp.inject({
        method: "GET",
        url: "/v2/test-crypto",
        headers: { "x-api-key": "sk_sovereign_forged" },
      });
      expect(res.statusCode).to.equal(200);
      expect(res.headers["x-license-tier"]).to.equal("community");
      expect(res.headers["x-tenant-ratelimit-limit"]).to.equal("60");
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

    it("should handle invalid content-length header safely", async () => {
      const res = await testApp.inject({
        method: "GET",
        url: "/v2/test-crypto",
        headers: {
          "content-length": "not-a-number",
        },
      });
      expect(res.statusCode).to.equal(200);
      expect(res.headers["x-license-tier"]).to.equal("community");
    });

    it("should respond with 413 when payload exceeds tier limit", async () => {
      const res = await testApp.inject({
        method: "GET",
        url: "/v2/test-crypto",
        headers: {
          "content-length": "5000000", // 5MB exceeds community 1MB limit
        },
      });

      expect(res.statusCode).to.equal(413);
      expect(res.headers["retry-after"]).to.be.undefined;
      const json = JSON.parse(res.payload);
      expect(json.statusCode).to.equal(413);
      expect(json.error).to.equal("Payload Too Large");
      expect(json.tier).to.equal("community");
    });

    it("should respond with 429 when tenant rate limit is exceeded", async () => {
      const headers = { "x-test-sub": "tenant-exhaust" };
      // Exhaust 60 tokens
      for (let i = 0; i < 60; i++) {
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
      const json = JSON.parse(res.payload);
      expect(json.statusCode).to.equal(429);
      expect(json.error).to.equal("Too Many Requests");
      expect(json.tier).to.equal("community");
    });
  });
});
