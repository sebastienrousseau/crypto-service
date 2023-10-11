/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview Main server setup for the Crypto Service Suite application.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import {
  compressOptions,
  consoleOutput,
  fastifyOptions,
  healthCheckOptions,
  rateLimitOptions,
} from "./config/constants";

import Accepts from "@fastify/accepts";
import Etag from "@fastify/etag";
import fastifyCompress from "@fastify/compress";
import fastifyHealthcheck from "fastify-healthcheck";
import fastifyRateLimit from "@fastify/rate-limit";
import logger from "./lib/logger";
import routes from './routes';
import * as fastify from "fastify";

/**
 * Initializes and configures the Fastify application instance.
 *
 * This async function initializes a Fastify instance and configures it with various plugins.
 * It logs the environment details, registers routes, and returns the configured Fastify instance.
 *
 * @function
 * @async
 * @returns {Promise<fastify.FastifyInstance>} - The configured Fastify instance.
 */
async function init(): Promise<fastify.FastifyInstance> {

  // Create a new fastify instance with options defined in `fastifyOptions`.
  const app = fastify.fastify(fastifyOptions);

  // Logger middleware for fastify instance (logs to console)
  logger.info("\n\nEnvironment details: " + consoleOutput);

  // Register API routes.
  routes(app);

  // Register plugins with the Fastify instance.
  await app
    .register(Accepts) // fastify-accepts plugin
    .register(Etag) // fastify-etag plugin
    .register(fastifyCompress, compressOptions) // fastify-compress plugin
    .register(fastifyHealthcheck, healthCheckOptions) // fastify-healthcheck plugin
    .register(fastifyRateLimit, rateLimitOptions) // fastify-rate-limit plugin
    .ready();

  // Return the configured Fastify instance.
  return app
}

// Export the `init` function to be used elsewhere.
export { init };
