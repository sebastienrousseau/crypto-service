/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Registers all API v1 routes for the Fastify application.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import * as fastify from "fastify";
import decryptRoute from "./v1/decrypt";
import encryptRoute from "./v1/encrypt";
import generateRoute from "./v1/generate";
import indexRoute from "./v1/index";
import revokeRoute from "./v1/revoke";
import verifyRoute from "./v1/verify";

/**
 * Registers all API version 1 routes with the Fastify application instance.
 *
 * The following routes are registered:
 * - `/v1/decrypt`: Route for data decryption.
 * - `/v1/encrypt`: Route for data encryption.
 * - `/v1/generate`: Route for key pair generation.
 * - `/v1/`: Root route providing general information about the Crypto Server.
 * - `/v1/revoke`: Route for key revocation.
 * - `/v1/verify`: Route for signature verification.
 *
 * @param app {fastify.FastifyInstance} - The Fastify instance to register the routes.
 */
export default (app: fastify.FastifyInstance): void => {
  decryptRoute(app);
  encryptRoute(app);
  generateRoute(app);
  indexRoute(app);
  revokeRoute(app);
  verifyRoute(app);
};
