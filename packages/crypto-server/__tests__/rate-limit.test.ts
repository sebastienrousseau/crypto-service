/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * End-to-end tests for the global rate limit and the tenant metering layer
 * as wired by `init()`.
 */
import { expect } from "chai";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";
import { rateLimitOptions, resolveRateLimitMax } from "../src/config/constants";

/** Sets or clears RATE_LIMIT_MAX (assigning `undefined` would store "undefined"). */
function setMaxEnv(value: string | undefined): void {
  if (value === undefined) delete process.env["RATE_LIMIT_MAX"];
  else process.env["RATE_LIMIT_MAX"] = value;
}

/** Sends `count` GET requests to `url` from `remoteAddress`. */
async function hit(
  app: FastifyInstance,
  url: string,
  count: number,
  remoteAddress?: string,
) {
  const responses = [];
  for (let i = 0; i < count; i++) {
    responses.push(await app.inject({ method: "GET", url, remoteAddress }));
  }
  return responses;
}

describe("Global rate limit (server)", function () {
  this.timeout(15000);

  let app: FastifyInstance;
  let savedMax: string | undefined;

  beforeEach(async () => {
    // Run against the production default, not the raised test-run limit.
    savedMax = process.env["RATE_LIMIT_MAX"];
    setMaxEnv(undefined);
    app = await init();
  });

  afterEach(async () => {
    await app.close();
    setMaxEnv(savedMax);
  });

  it("answers 429 with Retry-After once the limit is exceeded", async () => {
    const max = rateLimitOptions.max;
    const ok = await hit(app, "/v2/algorithms", max, "203.0.113.5");
    ok.forEach((res) => expect(res.statusCode).to.equal(200));

    const [limited] = await hit(app, "/v2/algorithms", 1, "203.0.113.5");
    expect(limited.statusCode).to.equal(429);
    expect(limited.headers["retry-after"]).to.exist;
    expect(limited.headers["content-type"]).to.match(
      /^application\/problem\+json/,
    );
    expect(limited.headers["x-ratelimit-limit"]).to.equal(String(max));
    const body = JSON.parse(limited.payload);
    expect(body.status).to.equal(429);
    expect(body.type).to.equal("urn:crypto-service:problem:rate-limited");
    expect(body.title).to.equal("Too Many Requests");
    expect(body.detail).to.include("requests are allowed per");
  });

  it("does not exempt loopback clients from the limit", async () => {
    const max = rateLimitOptions.max;
    await hit(app, "/v2/algorithms", max);
    const [limited] = await hit(app, "/v2/algorithms", 1);
    expect(limited.statusCode).to.equal(429);
  });

  for (const probe of ["/health", "/live", "/ready", "/metrics"]) {
    it(`never rate-limits the ${probe} probe`, async () => {
      const responses = await hit(
        app,
        probe,
        rateLimitOptions.max * 2,
        "203.0.113.6",
      );
      responses.forEach((res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.headers["x-ratelimit-limit"]).to.be.undefined;
      });
    });
  }

  it("ignores a client-chosen API key prefix when picking the tier", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v2/algorithms",
      headers: { "x-api-key": "sk_sovereign_forged" },
      remoteAddress: "203.0.113.7",
    });
    expect(res.statusCode).to.equal(200);
    expect(res.headers["x-license-tier"]).to.equal("community");
    expect(res.headers["x-tenant-ratelimit-limit"]).to.equal("60");
    // The global limiter owns X-RateLimit-*; metering must not overwrite it.
    expect(res.headers["x-ratelimit-limit"]).to.equal(
      String(rateLimitOptions.max),
    );
  });
});

describe("resolveRateLimitMax", () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env["RATE_LIMIT_MAX"];
  });

  afterEach(() => {
    setMaxEnv(saved);
  });

  it("uses RATE_LIMIT_MAX when it is a positive integer", () => {
    setMaxEnv("250");
    expect(resolveRateLimitMax()).to.equal(250);
  });

  it("falls back to the default for missing or invalid values", () => {
    for (const value of [undefined, "", "0", "-5", "1.5", "lots"]) {
      setMaxEnv(value);
      expect(resolveRateLimitMax()).to.equal(rateLimitOptions.max);
    }
  });
});
