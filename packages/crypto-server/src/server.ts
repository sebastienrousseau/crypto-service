/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Main server setup for the Crypto Service Suite application.
 */

import {
  compressOptions,
  consoleOutput,
  corsOptions,
  fastifyOptions,
  healthCheckOptions,
  helmetOptions,
  rateLimitOptions,
  LIB_VERSION,
} from "./config/constants";

import Accepts from "@fastify/accepts";
import fastifyCors from "@fastify/cors";
import Etag from "@fastify/etag";
import fastifyCompress from "@fastify/compress";
import fastifyHealthcheck from "fastify-healthcheck";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { randomUUID } from "crypto";
import logger from "./lib/logger";
import { registerAuth } from "./lib/auth";
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

  // Assign a unique request ID (or honour the upstream one) and propagate
  // it as a response header for distributed tracing.
  app.addHook("onRequest", async (request, reply) => {
    const reqId = (request.headers["x-request-id"] as string) ?? randomUUID();
    reply.header("x-request-id", reqId);
  });

  // OpenAPI documentation — auto-generated from Fastify route schemas.
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Crypto Service Suite API",
        description:
          "REST API for low-level cryptographic operations: key generation, encryption, decryption, signing, verification, and revocation.",
        version: JSON.parse(LIB_VERSION),
      },
      components: {
        securitySchemes: {
          apiKey: {
            type: "apiKey",
            name: "x-api-key",
            in: "header",
          },
        },
      },
      security: [{ apiKey: [] }],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
  });

  await app
    .register(Accepts, { decorateReply: true })
    .register(fastifyHelmet, helmetOptions)
    .register(fastifyCors, corsOptions)
    .register(Etag)
    .register(fastifyCompress, compressOptions)
    .register(fastifyHealthcheck, healthCheckOptions)
    .register(fastifyRateLimit, rateLimitOptions);

  // JWT authentication (registers the jwt decorator if JWT_SECRET is set)
  await registerAuth(app);

  // Register routes inside an encapsulated plugin so they inherit all
  // the plugins registered above.
  await app.register(async (scope) => {
    routes(scope);
  });

  await app.ready();
  return app;
}

export { init };
