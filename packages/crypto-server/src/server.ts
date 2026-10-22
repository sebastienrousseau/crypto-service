/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Main server setup for the Crypto Service Suite application.
 */

import {
  compressOptions,
  serverDetails,
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
import logger, { requestIdFrom } from "./lib/logger";
import { authenticate, authorizeRoute, registerAuth } from "./lib/auth";
import {
  assertRoutesCovered,
  isPublicRoute,
  type RegisteredRoute,
} from "./config/auth-policy";
import { docsEnabled } from "./config/env";
import { registerMetering } from "./enterprise/metering";
import { keyStoreFromEnv } from "./lib/key-store";
import { KmsRegistry } from "./lib/kms-providers";
import { KmsOwners } from "./lib/kms-owners";
import {
  CryptoWorkers,
  KDF_LIMITS,
  SIGNING_LIMITS,
} from "./lib/crypto-workers";
import { registerProblemHandlers } from "./lib/problem";
import { propagateTraceContext } from "./utils/trace";
import { OpaqueStore } from "./lib/opaque-store";
import { registerHttpMetrics } from "./lib/http-metrics";
import { trackLifecycle } from "./lib/readiness";
import routes from "./routes";
import * as fastify from "fastify";

/** Registers the OpenAPI spec and the Swagger UI served at `/docs`. */
async function registerDocs(app: fastify.FastifyInstance): Promise<void> {
  // DOCS_ENABLED=0 serves neither the UI nor the OpenAPI document.
  if (!docsEnabled()) return;
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
 * Attach the server's stateful services, each built from the environment:
 * key custody (lib/key-store.ts), KMS providers and key owners
 * (lib/kms-providers.ts, lib/kms-owners.ts), worker pools for KDF and
 * post-quantum signing (lib/crypto-workers.ts) and OPAQUE state
 * (lib/opaque-store.ts). Invalid settings throw, so the server does not
 * start.
 */
function decorateServices(app: fastify.FastifyInstance): void {
  app.decorate("keyStore", keyStoreFromEnv());
  app.decorate("kms", new KmsRegistry(process.env));
  app.decorate(
    "kmsOwners",
    new KmsOwners(process.env["CRYPTO_KEY_OUT_DIR"] || undefined),
  );
  app.decorate("kdf", new CryptoWorkers(KDF_LIMITS));
  app.decorate("signer", new CryptoWorkers(SIGNING_LIMITS));
  app.decorate("opaqueStore", new OpaqueStore());
  trackLifecycle(app);
  app.addHook("onClose", async () => {
    await Promise.all([app.kdf.close(), app.signer.close()]);
  });
}

/**
 * Initializes and configures the Fastify application instance.
 *
 * Plugins are registered **before** routes so that compression, rate
 * limiting, ETags and content negotiation apply to every route. The
 * previous ordering (routes first) silently disabled all of these
 * plugins for every registered route.
 *
 * `overrides.logger` replaces the logger configuration, so tests can
 * capture what the server logs.
 */
async function init(
  overrides: Pick<fastify.FastifyServerOptions, "logger"> = {},
): Promise<fastify.FastifyInstance> {
  // One logger for the whole server (lib/logger.ts), unless a caller
  // passes its own logger configuration.
  const app = fastify.fastify({
    ...fastifyOptions,
    genReqId: (req) => requestIdFrom(req.headers["x-request-id"]),
    ...(overrides.logger === undefined
      ? { loggerInstance: logger }
      : { logger: overrides.logger }),
  });

  // Record every route, including those plugins add, so the boot check
  // can prove each one is covered by the authorization policy.
  const registered: RegisteredRoute[] = [];
  app.addHook("onRoute", (route) => {
    registered.push({ method: route.method, url: route.url });
  });

  app.log.info(serverDetails, "Server configuration");

  // Every error response is an RFC 9457 application/problem+json body.
  registerProblemHandlers(app);

  // Count every response, by route pattern, for /metrics.
  registerHttpMetrics(app);

  // Assign a unique request ID (or honour the upstream one) and propagate
  // W3C trace context headers for distributed tracing.
  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
    propagateTraceContext(request, reply);
  });

  // Prevent caching of every response but the static API documentation:
  // v1 and v2 routes return keys and plaintext, and probe results must be
  // fresh.
  app.addHook("onSend", async (request, reply) => {
    if (!request.url.startsWith("/docs")) {
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
    if (isPublicRoute(request.routeOptions.url ?? request.url)) return;
    const auth = await authenticate(request, reply);
    if (!auth || !authorizeRoute(request, reply, auth)) return reply;
    (request as { auth?: unknown }).auth = auth;
  });

  decorateServices(app);

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
