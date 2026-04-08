/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @fileoverview Main server setup for the Crypto Service Suite application.
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
import routes from "./routes";
import * as fastify from "fastify";

/**
 * Initializes and configures the Fastify application instance.
 *
 * Plugins are registered **before** routes so that compression, rate
 * limiting, ETags and content negotiation apply to every route. The
 * previous ordering (routes first) silently disabled all of these
 * plugins for every registered route.
 */
async function init(): Promise<fastify.FastifyInstance> {
  const app = fastify.fastify(fastifyOptions);

  logger.info("\n\nEnvironment details: " + consoleOutput);

  await app
    .register(Accepts, { decorateReply: true })
    .register(Etag)
    .register(fastifyCompress, compressOptions)
    .register(fastifyHealthcheck, healthCheckOptions)
    .register(fastifyRateLimit, rateLimitOptions);

  // Register routes inside an encapsulated plugin so they inherit all
  // the plugins registered above.
  await app.register(async (scope) => {
    routes(scope);
  });

  await app.ready();
  return app;
}

export { init };
