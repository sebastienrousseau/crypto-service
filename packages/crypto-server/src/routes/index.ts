/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Registers all API routes (v1 + v2) for the Fastify application.
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

export default (app: fastify.FastifyInstance): void => {
  // v1: OpenPGP-based operations (backward compatible)
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
