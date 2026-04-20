/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Configuration settings and options for the Fastify server and associated plugins.
 * @author The Crypto Service Suite
 */

import { FastifyServerOptions } from "fastify";
import { FastifyCompressOptions } from "@fastify/compress";
import type { FastifyCorsOptions } from "@fastify/cors";
import type { FastifyHelmetOptions } from "@fastify/helmet";
import pack from "../../package.json";

/**
 * @constant {string} LIB_VERSION
 * The current version of the library, extracted from package.json.
 */
export const LIB_VERSION = JSON.stringify(pack.version);

/**
 * @constant {string} HOST
 * The hostname for the server, defaulting to "localhost".
 */
export const HOST = process.env["HOST"] ?? "localhost";

/**
 * @constant {(string | number)} PORT
 * The port for the server, defaulting to 3000.
 */
export const PORT = process.env["PORT"] ?? 3000;

/**
 * @constant {string} PROTOCOL
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
 * @constant {string[]} consoleOutput
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
 * @constant {FastifyServerOptions} fastifyOptions
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
 * @constant {FastifyCompressOptions} compressOptions
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
 * @constant {FastifyHelmetOptions} helmetOptions
 * Security headers via @fastify/helmet. ContentSecurityPolicy is relaxed
 * for the JSON-only API surface.
 */
export const helmetOptions: FastifyHelmetOptions = {
  global: true,
  contentSecurityPolicy: false,
};

/**
 * @constant {FastifyCorsOptions} corsOptions
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
 * @constant {object} rateLimitOptions
 * Configuration options for the rate-limit plugin.
 */
export const rateLimitOptions = {
  global: true,
  max: 10,
  timeWindow: "1 minute",
  allowList: ["127.0.0.1"],
  nameSpace: "crypto-server-rate-limit-",
  addHeaders: {
    "x-ratelimit-limit": true,
    "x-ratelimit-remaining": true,
    "x-ratelimit-reset": true,
    "retry-after": true,
  },

  errorResponseBuilder(
    req: { ip: string; log: { warn: (msg: string) => void } },
    context: { max: number; after: string; ttl: number },
  ) {
    req.log.warn(`${req.ip} have been rateLimited`);
    return {
      code: 429,
      error: "Too Many Requests",
      message: `Only ${context.max} requests are allowed per ${context.after}. Try again soon.`,
      date: Date.now(),
      expiresIn: context.ttl,
    };
  },
};

/**
 * @constant {object} healthCheckOptions
 * Configuration options for the health check functionality.
 */
export const healthCheckOptions = {
  healthcheckUrl: "/health",
  exposeUptime: true,
};
