/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Registers all API routes (v1 + v2) for the Fastify application.
 */

import * as fastify from "fastify";
import decryptRoute from "./v1/decrypt";
import encryptRoute from "./v1/encrypt";
import generateRoute from "./v1/generate";
import indexRoute from "./v1/index";
import revokeRoute from "./v1/revoke";
import verifyRoute from "./v1/verify";
import v2Routes from "./v2";
import probeRoutes from "./probes";

/** Registers all API route groups (v1, v2, probes) on the Fastify instance. */
export default (app: fastify.FastifyInstance): void => {
  // v1: OpenPGP-based operations (deprecated — will be removed in v1.0.0)
  // Add deprecation warning header to all v1 responses
  app.addHook("onSend", async (request, reply) => {
    if (request.url.startsWith("/v1/")) {
      reply.header("Deprecation", "true");
      reply.header("Sunset", "2027-01-01T00:00:00Z");
      reply.header("Link", '</v2>; rel="successor-version"');
    }
  });

  decryptRoute(app);
  encryptRoute(app);
  generateRoute(app);
  indexRoute(app);
  revokeRoute(app);
  verifyRoute(app);

  // v2: Modern cryptographic operations (noble-based)
  v2Routes(app);

  // Operational probes (liveness, readiness, metrics)
  probeRoutes(app);
};
