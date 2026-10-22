/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import logger from "../src/lib/logger";
import {
  LIB_VERSION,
  HOST,
  PORT,
  PROTOCOL,
  serverDetails,
  fastifyOptions,
  compressOptions,
  rateLimitOptions,
  healthCheckOptions,
} from "../src/config/constants";

describe("Crypto Server", () => {
  describe("Logger", () => {
    it("should export a logger instance", () => {
      expect(logger).to.exist;
    });

    it("should have info level logging", () => {
      expect(logger.level).to.be.a("string");
    });

    it("names the service in every line", () => {
      expect(logger.bindings().service).to.equal("crypto-server");
    });

    it("should be able to log messages", () => {
      expect(() => logger.info("Test log message")).to.not.throw();
    });

    it("should be able to log warnings", () => {
      expect(() => logger.warn("Test warning message")).to.not.throw();
    });

    it("should be able to log errors", () => {
      expect(() => logger.error("Test error message")).to.not.throw();
    });
  });

  describe("Constants", () => {
    describe("LIB_VERSION", () => {
      it("should be a string", () => {
        expect(LIB_VERSION).to.be.a("string");
      });

      it("should contain a version number", () => {
        expect(LIB_VERSION).to.match(/"\d+\.\d+\.\d+"/);
      });
    });

    describe("HOST", () => {
      it("should default to localhost when env not set", () => {
        expect(HOST).to.be.a("string");
      });
    });

    describe("PORT", () => {
      it("should have a valid port value", () => {
        expect(PORT).to.satisfy((p: string | number) => {
          const num = typeof p === "string" ? parseInt(p, 10) : p;
          return num >= 0 && num <= 65535;
        });
      });
    });

    describe("PROTOCOL", () => {
      it("should be http or https", () => {
        expect(PROTOCOL).to.match(/^https?$/);
      });
    });

    describe("serverDetails", () => {
      it("holds the protocol, host, port and version as fields", () => {
        expect(serverDetails).to.deep.equal({
          protocol: PROTOCOL,
          host: HOST,
          port: PORT,
          version: JSON.parse(LIB_VERSION),
        });
      });
    });

    describe("fastifyOptions", () => {
      it("should have bodyLimit configured", () => {
        expect(fastifyOptions.bodyLimit).to.be.a("number");
        expect(fastifyOptions.bodyLimit).to.be.greaterThan(0);
      });

      it("should have caseSensitive set to true", () => {
        expect(fastifyOptions.caseSensitive).to.be.true;
      });

      it("should leave request logging at Fastify's default (enabled)", () => {
        // Setting disableRequestLogging at all, even to false, emits
        // Fastify's FSTDEP023 deprecation warning at startup.
        expect(fastifyOptions.disableRequestLogging).to.be.undefined;
      });

      it("should have keepAliveTimeout configured", () => {
        expect(fastifyOptions.keepAliveTimeout).to.be.a("number");
      });

      it("leaves request IDs to the server's genReqId", () => {
        // init() supplies the shared logger and genReqId (lib/logger.ts).
        expect(fastifyOptions.requestIdHeader).to.equal(false);
      });

      it("should not unconditionally trust proxy headers", () => {
        // Default must be `false` (or an explicit CIDR list supplied via
        // the TRUSTED_PROXY_CIDRS env var). Blanket `true` enabled IP-
        // based rate-limit bypass via spoofed X-Forwarded-For headers.
        const tp = fastifyOptions.trustProxy;
        expect(tp === false || Array.isArray(tp)).to.equal(true);
      });

      it("should have proto poisoning protection", () => {
        expect(fastifyOptions.onProtoPoisoning).to.equal("error");
      });

      it("should have constructor poisoning protection", () => {
        expect(fastifyOptions.onConstructorPoisoning).to.equal("error");
      });
    });

    describe("compressOptions", () => {
      it("should have global compression enabled", () => {
        expect(compressOptions.global).to.be.true;
      });

      it("should have a threshold set", () => {
        expect(compressOptions.threshold).to.be.a("number");
        expect(compressOptions.threshold).to.be.greaterThan(0);
      });

      it("should have zlib options configured", () => {
        expect(compressOptions.zlibOptions).to.exist;
        expect(compressOptions.zlibOptions?.level).to.be.a("number");
      });
    });

    describe("rateLimitOptions", () => {
      it("should have global rate limiting enabled", () => {
        expect(rateLimitOptions.global).to.be.true;
      });

      it("should have a max requests limit", () => {
        expect(rateLimitOptions.max).to.be.a("number");
        expect(rateLimitOptions.max).to.be.greaterThan(0);
      });

      it("should have a time window", () => {
        expect(rateLimitOptions.timeWindow).to.be.a("string");
      });

      it("should exempt only probe paths, not loopback clients", () => {
        const { allowList } = rateLimitOptions;
        expect(allowList).to.be.a("function");
        expect(allowList({ url: "/live" })).to.be.true;
        expect(allowList({ url: "/health?full=1" })).to.be.true;
        expect(allowList({ url: "/v2/algorithms" })).to.be.false;
      });

      it("should have rate limit headers configured", () => {
        expect(rateLimitOptions.addHeaders).to.exist;
        expect(rateLimitOptions.addHeaders["x-ratelimit-limit"]).to.be.true;
        expect(rateLimitOptions.addHeaders["x-ratelimit-remaining"]).to.be.true;
        expect(rateLimitOptions.addHeaders["x-ratelimit-reset"]).to.be.true;
        expect(rateLimitOptions.addHeaders["retry-after"]).to.be.true;
      });

      it("should have an errorResponseBuilder function", () => {
        expect(rateLimitOptions.errorResponseBuilder).to.be.a("function");
      });

      it("errorResponseBuilder should return proper error object", () => {
        const mockReq = {
          ip: "192.168.1.1",
          log: { warn: () => {} },
        };
        const mockContext = {
          statusCode: 429,
          max: 10,
          after: "1 minute",
          ttl: 60000,
        };

        const result = rateLimitOptions.errorResponseBuilder(
          mockReq,
          mockContext,
        );

        expect(result.statusCode).to.equal(429);
        expect(result.code).to.equal(429);
        expect(result.error).to.equal("Too Many Requests");
        expect(result.message).to.include("10 requests");
        expect(result.message).to.include("1 minute");
        expect(result.date).to.be.a("number");
        expect(result.expiresIn).to.equal(60000);
      });
    });

    describe("healthCheckOptions", () => {
      it("should have healthcheck URL configured", () => {
        expect(healthCheckOptions.healthcheckUrl).to.equal("/health");
      });

      it("should expose uptime", () => {
        expect(healthCheckOptions.exposeUptime).to.be.true;
      });
    });
  });
});
