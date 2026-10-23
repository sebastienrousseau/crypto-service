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
import { v1Enabled } from "../config/env";

/**
 * RFC 9745 `Deprecation`: when v1 was deprecated, 2026-08-21 (commit
 * 012e1bf, which marked every v1 route `@deprecated`).
 */
export const V1_DEPRECATION = "@1787270400";

/** RFC 8594 `Sunset`: the date v1 may be removed, as an HTTP date. */
export const V1_SUNSET = "Fri, 01 Jan 2027 00:00:00 GMT";

/** Where a v1 client finds the v2 replacement for each route. */
export const V1_MIGRATION_LINK =
  '<https://github.com/sebastienrousseau/crypto-service/blob/main/MIGRATION.md>; rel="deprecation"; type="text/html"';

/** Registers all API route groups (v1, v2, probes) on the Fastify instance. */
export default (app: fastify.FastifyInstance): void => {
  // v1: OpenPGP-based operations, deprecated (see MIGRATION.md).
  // V1_ENABLED=0 removes them before their sunset.
  if (v1Enabled()) {
    app.addHook("onSend", async (request, reply) => {
      if (request.url.startsWith("/v1/")) {
        reply.header("Deprecation", V1_DEPRECATION);
        reply.header("Sunset", V1_SUNSET);
        reply.header("Link", V1_MIGRATION_LINK);
      }
    });
    decryptRoute(app);
    encryptRoute(app);
    generateRoute(app);
    revokeRoute(app);
    verifyRoute(app);
  }
  indexRoute(app);

  // v2: Modern cryptographic operations (noble-based)
  v2Routes(app);

  // Operational probes (liveness, readiness, metrics)
  probeRoutes(app);
};
