/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Configuration parsing. Numbers were read with parseInt, so PORT=3000abc
 * started on port 3000 and SHUTDOWN_TIMEOUT_MS=abc became NaN (a force
 * exit timer that fired at once); RATE_LIMIT_MAX and
 * KEY_STORE_MAX_PER_PRINCIPAL fell back to their defaults when invalid,
 * so a typo silently changed a limit; and loadConfig called
 * process.exit, so nothing tested it. Every numeric setting is now a
 * whole number in range or the server refuses to start, with every
 * problem listed in one ConfigError.
 */
import { expect } from "chai";
import { ConfigError, loadConfig } from "../src/config/env";
import { resolveRateLimitMax } from "../src/config/constants";
import { integerSetting } from "../src/config/settings";

const BASE = { ALLOW_ANONYMOUS: "1" };

function configError(env: NodeJS.ProcessEnv): ConfigError {
  try {
    loadConfig(env);
  } catch (e) {
    expect(e).to.be.instanceOf(ConfigError);
    return e as ConfigError;
  }
  throw new Error("expected a ConfigError");
}

describe("configuration", () => {
  it("applies the defaults", () => {
    const config = loadConfig(BASE);
    expect(config).to.include({
      host: "localhost",
      port: 3000,
      protocol: "http",
      nodeEnv: "development",
      logLevel: "info",
      shutdownTimeoutMs: 30000,
      rateLimitMax: 10,
    });
    expect(config.corsOrigins).to.equal(false);
    expect(Object.isFrozen(config)).to.equal(true);
  });

  it("reads every setting", () => {
    const config = loadConfig({
      ...BASE,
      HOST: "0.0.0.0",
      PORT: "0",
      PROTOCOL: "https",
      NODE_ENV: "test",
      LOG_LEVEL: "debug",
      CRYPTO_API_KEY: "k",
      CORS_ORIGIN: "https://a.example, ,https://b.example",
      TRUSTED_PROXY_CIDRS: "10.0.0.0/8",
      CRYPTO_KEY_DIR: "/keys",
      CRYPTO_KEY_OUT_DIR: "/out",
      SHUTDOWN_TIMEOUT_MS: "5000",
      RATE_LIMIT_MAX: "250",
    });
    expect(config).to.deep.include({
      host: "0.0.0.0",
      port: 0,
      protocol: "https",
      apiKey: "k",
      corsOrigins: ["https://a.example", "https://b.example"],
      trustProxy: ["10.0.0.0/8"],
      keyDir: "/keys",
      keyOutDir: "/out",
      shutdownTimeoutMs: 5000,
      rateLimitMax: 250,
    });
    expect(loadConfig({ ...BASE, CORS_ORIGIN: " , " }).corsOrigins).to.equal(
      false,
    );
  });

  it("refuses a number with trailing text, a fraction or a sign", () => {
    for (const PORT of [
      "3000abc",
      "30.5",
      "-1",
      "+80",
      " 80",
      "70000",
      "0x50",
    ]) {
      expect(configError({ ...BASE, PORT }).message, PORT).to.include("PORT");
    }
  });

  it("refuses an invalid shutdown timeout, rate limit or key quota", () => {
    const err = configError({
      ...BASE,
      SHUTDOWN_TIMEOUT_MS: "abc",
      RATE_LIMIT_MAX: "0",
      KEY_STORE_MAX_PER_PRINCIPAL: "lots",
    });
    expect(err.message).to.include("SHUTDOWN_TIMEOUT_MS");
    expect(err.message).to.include("RATE_LIMIT_MAX");
    expect(err.message).to.include("KEY_STORE_MAX_PER_PRINCIPAL");
  });

  it("lists every problem at once, without exiting the process", () => {
    const err = configError({
      PROTOCOL: "ftp",
      NODE_ENV: "staging",
      LOG_LEVEL: "loud",
      PORT: "x",
      JWT_SECRET: "short",
      KMS_PROVIDERS: "nope",
      CRYPTO_KEY_STORAGE_KEY: "passphrase",
    });
    expect(err.message).to.match(/^Configuration validation failed:\n/);
    for (const name of [
      "PROTOCOL",
      "NODE_ENV",
      "LOG_LEVEL",
      "PORT",
      "JWT_SECRET",
      "KMS_PROVIDERS",
      "CRYPTO_KEY_STORAGE_KEY",
    ]) {
      expect(err.message, name).to.include(name);
    }
  });

  describe("integerSetting", () => {
    it("returns the fallback when unset or empty", () => {
      expect(integerSetting({}, "N", 7, 1)).to.equal(7);
      expect(integerSetting({ N: "" }, "N", 7, 1)).to.equal(7);
    });

    it("enforces the range", () => {
      expect(integerSetting({ N: "5" }, "N", 7, 1, 5)).to.equal(5);
      expect(() => integerSetting({ N: "6" }, "N", 7, 1, 5)).to.throw(
        'N must be a whole number from 1 to 5, got "6"',
      );
      expect(() =>
        integerSetting({ N: "99999999999999999999" }, "N", 7, 1),
      ).to.throw(/^N must be a whole number from 1 to \d+/);
    });
  });

  describe("resolveRateLimitMax", () => {
    it("refuses an invalid RATE_LIMIT_MAX instead of using the default", () => {
      expect(resolveRateLimitMax({})).to.equal(10);
      expect(resolveRateLimitMax({ RATE_LIMIT_MAX: "250" })).to.equal(250);
      for (const value of ["0", "-5", "1.5", "lots"]) {
        expect(() => resolveRateLimitMax({ RATE_LIMIT_MAX: value })).to.throw(
          /RATE_LIMIT_MAX/,
        );
      }
    });
  });
});
