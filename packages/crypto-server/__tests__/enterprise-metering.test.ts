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
    it("should resolve undefined or empty key to community tier", () => {
      expect(engine.resolveTier(undefined)).to.equal("community");
      expect(engine.resolveTier("")).to.equal("community");
      expect(engine.resolveTier("random_api_key")).to.equal("community");
    });

    it("should resolve sk_enterprise_ prefix to enterprise tier", () => {
      expect(engine.resolveTier("sk_enterprise_abc123")).to.equal("enterprise");
    });

    it("should resolve sk_sovereign_ prefix to sovereign tier", () => {
      expect(engine.resolveTier("sk_sovereign_xyz789")).to.equal("sovereign");
    });
  });

  describe("Token Bucket & Quota Evaluation", () => {
    it("should allow request and deduct tokens properly", () => {
      const start = 100000;
      const res1 = engine.checkRequest("sk_enterprise_test", 1024, start);
      expect(res1.allowed).to.be.true;
      expect(res1.tier).to.equal("enterprise");
      expect(res1.limit).to.equal(TIER_QUOTAS.enterprise.maxRequestsPerMinute);
      expect(res1.remaining).to.equal(
        TIER_QUOTAS.enterprise.maxRequestsPerMinute - 1,
      );

      // Check request without contentLength
      const res2 = engine.checkRequest("sk_enterprise_test", undefined, start);
      expect(res2.allowed).to.be.true;
      expect(res2.remaining).to.equal(
        TIER_QUOTAS.enterprise.maxRequestsPerMinute - 2,
      );
    });

    it("should reject request exceeding max payload size with 413", () => {
      const start = 100000;
      const oversizedPayload = TIER_QUOTAS.community.maxBytesPerPayload + 1024;
      const res = engine.checkRequest(undefined, oversizedPayload, start);
      expect(res.allowed).to.be.false;
      expect(res.statusCode).to.equal(413);
      expect(res.error).to.include("Payload size");
    });

    it("should reject request when tokens are exhausted with 429", () => {
      const start = 100000;
      const apiKey = "sk_community_exhaust";
      // Exhaust tokens
      for (let i = 0; i < TIER_QUOTAS.community.maxRequestsPerMinute; i++) {
        const check = engine.checkRequest(apiKey, 100, start);
        expect(check.allowed).to.be.true;
      }

      // Next request must be rejected
      const rejected = engine.checkRequest(apiKey, 100, start);
      expect(rejected.allowed).to.be.false;
      expect(rejected.statusCode).to.equal(429);
      expect(rejected.remaining).to.equal(0);
      expect(rejected.error).to.include("Tenant rate limit exceeded");
    });

    it("should refill tokens over elapsed time window", () => {
      const start = 100000;
      const apiKey = "sk_community_refill";
      // Exhaust all 60 tokens
      for (let i = 0; i < 60; i++) {
        engine.checkRequest(apiKey, 100, start);
      }
      expect(engine.checkRequest(apiKey, 100, start).allowed).to.be.false;

      // Advance clock by 30 seconds (half window = 30 tokens refilled)
      const halfWindow = start + 30000;
      const refilledCheck = engine.checkRequest(apiKey, 100, halfWindow);
      expect(refilledCheck.allowed).to.be.true;
      expect(refilledCheck.remaining).to.be.at.least(28);

      // Check non-positive elapsedMs does not fail or alter tokens
      engine.checkRequest(apiKey, 100, halfWindow - 5000);
    });

    it("should reset tenant store when reset() is invoked", () => {
      engine.checkRequest("sk_sovereign_test", 100);
      engine.reset();
      const fresh = engine.checkRequest("sk_sovereign_test", 100);
      expect(fresh.remaining).to.equal(
        TIER_QUOTAS.sovereign.maxRequestsPerMinute - 1,
      );
    });
  });

  describe("Fastify Plugin Integration", () => {
    let testApp: ReturnType<typeof Fastify>;

    beforeEach(async () => {
      testApp = Fastify();
      registerMetering(testApp, engine);

      testApp.get("/live", async () => ({ status: "alive" }));
      testApp.get("/docs", async () => ({ docs: true }));
      testApp.get("/docs/static", async () => ({ static: true }));
      testApp.get("/favicon.ico", async () => "ico");
      testApp.get("/v2/test-crypto", async () => ({ success: true }));

      await testApp.ready();
    });

    afterEach(async () => {
      await testApp.close();
    });

    it("should skip rate-limiting hooks on probes and documentation routes", async () => {
      const liveRes = await testApp.inject({ method: "GET", url: "/live" });
      expect(liveRes.statusCode).to.equal(200);
      expect(liveRes.headers["x-license-tier"]).to.be.undefined;

      const docsRes = await testApp.inject({ method: "GET", url: "/docs" });
      expect(docsRes.statusCode).to.equal(200);

      const favRes = await testApp.inject({
        method: "GET",
        url: "/favicon.ico",
      });
      expect(favRes.statusCode).to.equal(200);
    });

    it("should apply telemetry headers and allow requests within limit", async () => {
      const res = await testApp.inject({
        method: "GET",
        url: "/v2/test-crypto",
        headers: {
          "x-api-key": "sk_enterprise_client",
          "content-length": "256",
        },
      });

      expect(res.statusCode).to.equal(200);
      expect(res.headers["x-license-tier"]).to.equal("enterprise");
      expect(res.headers["x-ratelimit-limit"]).to.equal("1000");
      expect(res.headers["x-ratelimit-remaining"]).to.exist;
      expect(res.headers["x-ratelimit-reset"]).to.exist;
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
      const json = JSON.parse(res.payload);
      expect(json.statusCode).to.equal(413);
      expect(json.error).to.equal("Payload Too Large");
      expect(json.tier).to.equal("community");
    });

    it("should respond with 429 when tenant rate limit is exceeded", async () => {
      const apiKey = "sk_community_fastify_exhaust";
      // Exhaust 60 tokens
      for (let i = 0; i < 60; i++) {
        await testApp.inject({
          method: "GET",
          url: "/v2/test-crypto",
          headers: { "x-api-key": apiKey },
        });
      }

      const res = await testApp.inject({
        method: "GET",
        url: "/v2/test-crypto",
        headers: { "x-api-key": apiKey },
      });

      expect(res.statusCode).to.equal(429);
      const json = JSON.parse(res.payload);
      expect(json.statusCode).to.equal(429);
      expect(json.error).to.equal("Too Many Requests");
      expect(json.tier).to.equal("community");
    });
  });
});
