/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Configuration settings and options for the Fastify server and associated plugins.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import { FastifyServerOptions } from "fastify";
import { FastifyCompressOptions } from "@fastify/compress";
import * as pack from "../../package.json";

/**
 * @constant {string} LIB_VERSION
 * The current version of the library, extracted from package.json.
 */
export const LIB_VERSION = JSON.stringify(pack.version);

/**
 * @constant {string} HOST
 * The hostname for the server, defaulting to "localhost" if not provided in the environment variables.
 */
export const HOST = process.env.HOST ?? "localhost";

/**
 * @constant {(string | number)} PORT
 * The port for the server, defaulting to 3000 if not provided in the environment variables.
 */
export const PORT = process.env.PORT ?? 3000;

/**
 * @constant {string} PROTOCOL
 * The protocol for the server, defaulting to "http" if not provided in the environment variables.
 */
export const PROTOCOL = process.env.PROTOCOL ?? "http";

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
  bodyLimit: 256 * 1024 * 1,
  caseSensitive: true,
  connectionTimeout: 0,
  disableRequestLogging: true,
  ignoreTrailingSlash: false,
  keepAliveTimeout: 5000,
  logger: true,
  maxParamLength: 100,
  onConstructorPoisoning: "error",
  onProtoPoisoning: "error",
  return503OnClosing: true,
  trustProxy: true,
};

/**
 * @constant {FastifyCompressOptions} compressOptions
 * Configuration options for the Fastify compression plugin.
 */
export const compressOptions: FastifyCompressOptions = {
  global: true,
  threshold: 2048,
  zlibOptions: {
    level: 9,
  },
};

/**
 * @constant {object} rateLimitOptions
 * Configuration options for the rate-limit plugin.
 *
 * @remarks
 * Contains functional elements that handle rate limiting, logging, and error responses.
 */
export const rateLimitOptions = {
  // Configuration parameters...
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

  /**
   * @function errorResponseBuilder
   * Generates a custom error response when rate limiting is triggered.
   *
   * @param {object} req - The request object.
   * @param {object} context - The context related to rate limiting.
   *
   * @returns {object} - The custom error response.
   */
  errorResponseBuilder(req, context) {
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
 *
 * @property {string} healthcheckUrl - The URL path for health checks.
 * @property {boolean} exposeUptime - Flag to expose server uptime in the response.
 */
export const healthCheckOptions = {
  healthcheckUrl: "/health",
  exposeUptime: true,
};
