/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import {
  CORS_ORIGINS,
  compressOptions,
  consoleOutput,
  fastifyOptions,
  healthCheckOptions,
  rateLimitOptions,
} from "./config/constants";

import Accepts from "@fastify/accepts";
import Cors from "@fastify/cors";
import Etag from "@fastify/etag";
import Helmet from "@fastify/helmet";
import Jwt from "@fastify/jwt";
import fastifyCompress from "@fastify/compress";
import fastifyHealthcheck from "fastify-healthcheck";
import fastifyRateLimit from "@fastify/rate-limit";
import logger from "./lib/logger";
import routes from "./routes";
import * as fastify from "fastify";

/**
 * Initialise and configure the Fastify instance for the Crypto Server.
 *
 * Required environment:
 *  - JWT_SECRET   : signing/verification secret for `@fastify/jwt`.
 *  - CORS_ORIGINS : (optional) comma-separated allow-list. Default: deny.
 *  - TRUST_PROXY  : (optional) comma-separated CIDR list passed to Fastify.
 */
async function init(): Promise<fastify.FastifyInstance> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      "JWT_SECRET environment variable is required and must be at least 32 characters",
    );
  }

  const app = fastify.fastify(fastifyOptions);

  logger.info("\n\nEnvironment details: " + consoleOutput);

  await app
    .register(Helmet, { contentSecurityPolicy: false })
    .register(Cors, { origin: CORS_ORIGINS })
    .register(Accepts)
    .register(Etag)
    .register(fastifyCompress, compressOptions)
    .register(fastifyHealthcheck, healthCheckOptions)
    .register(fastifyRateLimit, rateLimitOptions)
    .register(Jwt, { secret: jwtSecret });

  // Decorate the instance with a preHandler that gates a route behind a JWT.
  app.decorate(
    "requireAuth",
    async (request: fastify.FastifyRequest, reply: fastify.FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        // Return reply explicitly so Fastify halts the lifecycle. Relying on
        // send-detection alone is brittle if a future hook plugin re-orders
        // the chain — see review Rec #5.
        return reply.code(401).send({ error: "unauthorized" });
      }
    },
  );

  routes(app);

  await app.ready();
  return app;
}

export { init };
