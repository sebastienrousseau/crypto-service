/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { FastifyServerOptions } from "fastify";
import { FastifyCompressOptions } from "@fastify/compress";
import * as pack from "../../package.json";

export const LIB_VERSION: string = pack.version;

export const HOST = process.env.HOST ?? "127.0.0.1";
export const PORT = process.env.PORT ?? 3000;
export const PROTOCOL = process.env.PROTOCOL ?? "http";

/**
 * Comma-separated CORS allow-list. Defaults to "no origin allowed".
 * Set to "*" only for local development.
 */
export const CORS_ORIGINS: string[] | false =
  process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()) ?? false;

/**
 * Trust-proxy ACL. Without an explicit allow-list a `trustProxy: true`
 * setting lets clients spoof `X-Forwarded-For` and bypass the rate limiter.
 * Default: trust nothing (i.e. take the socket address verbatim).
 */
export const TRUST_PROXY: string[] | boolean =
  process.env.TRUST_PROXY?.split(",").map((s) => s.trim()) ?? false;

export const consoleOutput = [
  `\n → protocol: ${PROTOCOL}`,
  `\n → hostname: ${HOST}`,
  `\n → port: ${PORT}`,
  `\n → version: ${LIB_VERSION}`,
  "\n",
];

export const fastifyOptions: FastifyServerOptions = {
  bodyLimit: 256 * 1024,
  caseSensitive: true,
  // 30s — was 0 (slowloris exposure).
  connectionTimeout: 30_000,
  disableRequestLogging: false,
  ignoreTrailingSlash: false,
  keepAliveTimeout: 5_000,
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    // Belt-and-braces redaction of any field that might carry secret material.
    redact: {
      paths: [
        'req.headers["authorization"]',
        'req.headers["proxy-authorization"]',
        'req.headers["cookie"]',
        "req.body.passphrase",
        "req.body.signingKey.passphrase",
        "req.body.decryptionKey.passphrase",
        "req.body.privateKey.passphrase",
      ],
      remove: true,
    },
  },
  maxParamLength: 100,
  onConstructorPoisoning: "error",
  onProtoPoisoning: "error",
  return503OnClosing: true,
  trustProxy: TRUST_PROXY,
};

export const compressOptions: FastifyCompressOptions = {
  global: true,
  threshold: 2048,
  zlibOptions: {
    // Level 6 is the conventional default. Level 9 is ~2x CPU for ~5% size
    // savings; with `Cache-Control: no-store` on every crypto endpoint there
    // is no caching benefit either.
    level: 6,
  },
};

export const rateLimitOptions = {
  global: true,
  max: 10,
  timeWindow: "1 minute",
  // Loopback bypass intentionally removed: combined with `trustProxy` it
  // allowed any client setting `X-Forwarded-For: 127.0.0.1` to evade limits.
  nameSpace: "crypto-server-rate-limit-",
  addHeaders: {
    "x-ratelimit-limit": true,
    "x-ratelimit-remaining": true,
    "x-ratelimit-reset": true,
    "retry-after": true,
  },
  errorResponseBuilder(
    req: import("fastify").FastifyRequest,
    context: { max: number; after: string; ttl: number },
  ) {
    req.log.warn({ ip: req.ip }, "rate limited");
    return {
      code: 429,
      error: "Too Many Requests",
      message: `Only ${context.max} requests are allowed per ${context.after}. Try again soon.`,
      date: Date.now(),
      expiresIn: context.ttl,
    };
  },
};

export const healthCheckOptions = {
  healthcheckUrl: "/health",
  exposeUptime: true,
};
