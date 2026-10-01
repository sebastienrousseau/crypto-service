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
  isProbePath,
  rateLimitOptions,
  resolveRateLimitMax,
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
import { authenticate, registerAuth } from "./lib/auth";
import { registerMetering } from "./enterprise/metering";
import routes from "./routes";
import * as fastify from "fastify";

/** Whether a request URL is a public (unauthenticated) path: probes and the API docs. */
function isPublicPath(url: string): boolean {
  return isProbePath(url) || url.startsWith("/docs");
}

/** Registers the OpenAPI spec and the Swagger UI served at `/docs`. */
async function registerDocs(app: fastify.FastifyInstance): Promise<void> {
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
}

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

  // Prevent caching of sensitive cryptographic responses.
  app.addHook("onSend", async (request, reply) => {
    if (request.url.startsWith("/v2/")) {
      reply.header("Cache-Control", "no-store, no-cache, must-revalidate");
      reply.header("Pragma", "no-cache");
    }
  });

  await registerDocs(app);

  await app
    .register(Accepts, { decorateReply: true })
    .register(fastifyHelmet, helmetOptions)
    .register(fastifyCors, corsOptions)
    .register(Etag)
    .register(fastifyCompress, compressOptions)
    .register(fastifyHealthcheck, healthCheckOptions)
    .register(fastifyRateLimit, {
      ...rateLimitOptions,
      max: resolveRateLimitMax(),
    });

  // JWT authentication (registers the jwt decorator if JWT_SECRET is set)
  await registerAuth(app);

  // Authenticate every request except probes and API docs. Fails closed:
  // with no credential configured, only ALLOW_ANONYMOUS=1 lets requests in.
  app.addHook("onRequest", async (request, reply) => {
    if (isPublicPath(request.url)) return;
    const auth = await authenticate(request, reply);
    if (!auth) return reply;
    (request as { auth?: unknown }).auth = auth;
  });

  // Multi-tenant Sovereign CaaS metering. Its preHandler hook runs after
  // every onRequest hook, so the tenant is the authenticated principal.
  registerMetering(app);

  // Register routes inside an encapsulated plugin so they inherit all
  // the plugins registered above.
  await app.register(async (scope) => {
    routes(scope);
  });

  await app.ready();
  return app;
}

export { init };
