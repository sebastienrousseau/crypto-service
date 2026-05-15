/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Configuration settings and options for the Fastify server and associated plugins.
 * @author The Crypto Service Suite
 */

import { FastifyServerOptions } from "fastify";
import { FastifyCompressOptions } from "@fastify/compress";
import type { FastifyCorsOptions } from "@fastify/cors";
import type { FastifyHelmetOptions } from "@fastify/helmet";
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const pack = require("../../package.json") as { version: string };

/**
 * @remarks {string} LIB_VERSION
 * The current version of the library, extracted from package.json.
 */
export const LIB_VERSION = JSON.stringify(pack.version);

/**
 * @remarks {string} HOST
 * The hostname for the server, defaulting to "localhost".
 */
export const HOST = process.env["HOST"] ?? "localhost";

/**
 * @remarks {(string | number)} PORT
 * The port for the server, defaulting to 3000.
 */
export const PORT = process.env["PORT"] ?? 3000;

/**
 * @remarks {string} PROTOCOL
 * The protocol for the server, defaulting to "http".
 */
export const PROTOCOL = process.env["PROTOCOL"] ?? "http";

/**
 * Parse the `TRUSTED_PROXY_CIDRS` environment variable (comma-separated) into
 * the shape expected by Fastify's `trustProxy` option.
 *
 * Unconditional `trustProxy: true` allowed IP-rate-limit bypass via spoofed
 * X-Forwarded-For headers.
 */
const parseTrustProxy = (): boolean | string[] => {
  const raw = process.env["TRUSTED_PROXY_CIDRS"];
  if (!raw) return false;
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

/**
 * @remarks {string[]} consoleOutput
 * An array of strings, defining the console output for environment details.
 */
export const consoleOutput = [
  `\n → protocol: ${PROTOCOL}`,
  `\n → hostname: ${HOST}`,
  `\n → port: ${PORT}`,
  `\n → version: ${LIB_VERSION}`,
  "\n",
];

/**
 * @remarks {FastifyServerOptions} fastifyOptions
 * Fastify server options to configure the Fastify instance.
 */
export const fastifyOptions: FastifyServerOptions = {
  bodyLimit: 256 * 1024,
  caseSensitive: true,
  connectionTimeout: 30_000,
  disableRequestLogging: false,
  ignoreTrailingSlash: false,
  keepAliveTimeout: 5000,
  logger: true,
  maxParamLength: 100,
  onConstructorPoisoning: "error",
  onProtoPoisoning: "error",
  return503OnClosing: true,
  trustProxy: parseTrustProxy(),
};

/**
 * @remarks {FastifyCompressOptions} compressOptions
 * Compression plugin options. Level 6 delivers ~99% of level 9's size
 * reduction at ~40% of the CPU cost.
 */
export const compressOptions: FastifyCompressOptions = {
  global: true,
  threshold: 2048,
  zlibOptions: {
    level: 6,
  },
};

/**
 * @remarks {FastifyHelmetOptions} helmetOptions
 * Security headers via @fastify/helmet. ContentSecurityPolicy is relaxed
 * for the JSON-only API surface.
 */
export const helmetOptions: FastifyHelmetOptions = {
  global: true,
  contentSecurityPolicy: false,
};

/**
 * @remarks {FastifyCorsOptions} corsOptions
 * Cross-Origin Resource Sharing defaults. Restrict to specific origins
 * in production via the `CORS_ORIGIN` environment variable (comma-separated).
 */
export const corsOptions: FastifyCorsOptions = {
  origin: process.env["CORS_ORIGIN"]
    ? process.env["CORS_ORIGIN"].split(",").map((o) => o.trim())
    : false,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "x-api-key"],
  credentials: true,
};

/**
 * @remarks {object} rateLimitOptions
 * Configuration options for the rate-limit plugin.
 */
export const rateLimitOptions = {
  /** Apply rate limiting to all routes. */
  global: true,
  /** Maximum number of requests per time window. */
  max: 10,
  /** Duration of the sliding rate-limit window. */
  timeWindow: "1 minute",
  /** IP addresses exempt from rate limiting. */
  allowList: ["127.0.0.1"],
  /** Redis/store key prefix for rate-limit counters. */
  nameSpace: "crypto-server-rate-limit-",
  /** Rate-limit headers to include in responses. */
  addHeaders: {
    /** Include the `X-RateLimit-Limit` header. */
    "x-ratelimit-limit": true,
    /** Include the `X-RateLimit-Remaining` header. */
    "x-ratelimit-remaining": true,
    /** Include the `X-RateLimit-Reset` header. */
    "x-ratelimit-reset": true,
    /** Include the `Retry-After` header. */
    "retry-after": true,
  },

  /** Builds the JSON body returned when a client is rate-limited. */
  errorResponseBuilder(
    req: { ip: string; log: { warn: (msg: string) => void } },
    context: { max: number; after: string; ttl: number },
  ) {
    req.log.warn(`${req.ip} have been rateLimited`);
    return {
      /** HTTP status code. */
      code: 429,
      /** Error name. */
      error: "Too Many Requests",
      /** Human-readable rate-limit explanation. */
      message: `Only ${context.max} requests are allowed per ${context.after}. Try again soon.`,
      /** Timestamp when the error occurred (epoch ms). */
      date: Date.now(),
      /** Milliseconds until the rate-limit window resets. */
      expiresIn: context.ttl,
    };
  },
};

/**
 * @remarks {object} healthCheckOptions
 * Configuration options for the health check functionality.
 */
export const healthCheckOptions = {
  /** URL path for the health check endpoint. */
  healthcheckUrl: "/health",
  /** Whether to include process uptime in the health response. */
  exposeUptime: true,
};
