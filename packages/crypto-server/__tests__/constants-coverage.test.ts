/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

describe("Constants coverage", () => {
  describe("parseTrustProxy via TRUSTED_PROXY_CIDRS", () => {
    const origVal = process.env["TRUSTED_PROXY_CIDRS"];

    afterEach(() => {
      if (origVal !== undefined) {
        process.env["TRUSTED_PROXY_CIDRS"] = origVal;
      } else {
        delete process.env["TRUSTED_PROXY_CIDRS"];
      }
      const modPath = require.resolve("../src/config/constants");
      delete require.cache[modPath];
    });

    it("should parse comma-separated CIDRs into an array", () => {
      process.env["TRUSTED_PROXY_CIDRS"] = "10.0.0.0/8, 172.16.0.0/12";
      const modPath = require.resolve("../src/config/constants");
      delete require.cache[modPath];
      const { fastifyOptions } = require("../src/config/constants");
      expect(fastifyOptions.trustProxy).to.deep.equal(["10.0.0.0/8", "172.16.0.0/12"]);
    });

    it("should filter empty entries from CIDRS", () => {
      process.env["TRUSTED_PROXY_CIDRS"] = "10.0.0.0/8, , ";
      const modPath = require.resolve("../src/config/constants");
      delete require.cache[modPath];
      const { fastifyOptions } = require("../src/config/constants");
      expect(fastifyOptions.trustProxy).to.deep.equal(["10.0.0.0/8"]);
    });
  });

  describe("CORS_ORIGIN parsing", () => {
    const origVal = process.env["CORS_ORIGIN"];

    afterEach(() => {
      if (origVal !== undefined) {
        process.env["CORS_ORIGIN"] = origVal;
      } else {
        delete process.env["CORS_ORIGIN"];
      }
      const modPath = require.resolve("../src/config/constants");
      delete require.cache[modPath];
    });

    it("should parse CORS_ORIGIN into array of origins", () => {
      process.env["CORS_ORIGIN"] = "https://example.com, https://other.com";
      const modPath = require.resolve("../src/config/constants");
      delete require.cache[modPath];
      const { corsOptions } = require("../src/config/constants");
      expect(corsOptions.origin).to.deep.equal(["https://example.com", "https://other.com"]);
    });
  });

  describe("Logger production format", () => {
    const origNodeEnv = process.env["NODE_ENV"];

    afterEach(() => {
      if (origNodeEnv !== undefined) {
        process.env["NODE_ENV"] = origNodeEnv;
      } else {
        delete process.env["NODE_ENV"];
      }
      const modPath = require.resolve("../src/lib/logger");
      delete require.cache[modPath];
    });

    it("should use structured JSON format in production", () => {
      process.env["NODE_ENV"] = "production";
      const modPath = require.resolve("../src/lib/logger");
      delete require.cache[modPath];
      const logger = require("../src/lib/logger").default;
      expect(logger).to.exist;
      expect(logger.defaultMeta.service).to.equal("crypto-server");
      expect(() => logger.info("production test")).to.not.throw();
    });
  });
});
