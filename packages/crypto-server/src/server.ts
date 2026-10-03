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
import { authenticate, authorizeRoute, registerAuth } from "./lib/auth";
import {
  assertRoutesCovered,
  isPublicRoute,
  type RegisteredRoute,
} from "./config/auth-policy";
import { registerMetering } from "./enterprise/metering";
import { keyStoreFromEnv } from "./lib/key-store";
import { KdfRunner } from "./lib/kdf-runner";
import { registerProblemHandlers } from "./lib/problem";
import { propagateTraceContext } from "./utils/trace";
import { OpaqueStore } from "./lib/opaque-store";
import routes from "./routes";
import * as fastify from "fastify";

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

  // Record every route, including those plugins add, so the boot check
  // can prove each one is covered by the authorization policy.
  const registered: RegisteredRoute[] = [];
  app.addHook("onRoute", (route) => {
    registered.push({ method: route.method, url: route.url });
  });

  logger.info("\n\nEnvironment details: " + consoleOutput);

  // Every error response is an RFC 9457 application/problem+json body.
  registerProblemHandlers(app);

  // Assign a unique request ID (or honour the upstream one) and propagate
  // W3C trace context headers for distributed tracing.
  app.addHook("onRequest", async (request, reply) => {
    const reqId = (request.headers["x-request-id"] as string) ?? randomUUID();
    reply.header("x-request-id", reqId);
    propagateTraceContext(request, reply);
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

  // Authenticate every request except probes and API docs, then enforce
  // the route's scope from the central policy. Fails closed: with no
  // credential configured, only ALLOW_ANONYMOUS=1 lets requests in, and a
  // route without a policy entry answers 403.
  app.addHook("onRequest", async (request, reply) => {
    if (isPublicRoute(request.url)) return;
    const auth = await authenticate(request, reply);
    if (!auth || !authorizeRoute(request, reply, auth)) return reply;
    (request as { auth?: unknown }).auth = auth;
  });

  // Server-side custody of generated key pairs (see lib/key-store.ts),
  // KDF / password hashing on worker threads (lib/kdf-runner.ts),
  // and OPAQUE authentication state (lib/opaque-store.ts).
  app.decorate("keyStore", keyStoreFromEnv());
  app.decorate("kdf", new KdfRunner());
  app.decorate("opaqueStore", new OpaqueStore());
  app.addHook("onClose", () => app.kdf.close());

  // Multi-tenant Sovereign CaaS metering. Its preHandler hook runs after
  // every onRequest hook, so the tenant is the authenticated principal.
  registerMetering(app);

  // Register routes inside an encapsulated plugin so they inherit all
  // the plugins registered above.
  await app.register(async (scope) => {
    routes(scope);
  });

  await app.ready();
  assertRoutesCovered(registered);
  return app;
}

export { init };
