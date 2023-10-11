/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Defines a route for signature verification in the Fastify application.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import * as fastify from 'fastify';
import verify from '@sebastienrousseau/crypto-lib/dist/lib/verify';
import fastifyRateLimit from "@fastify/rate-limit";
import { IHeadersVerify } from '../../@types/types';
import { rateLimitOptions } from "../../config/constants";

/**
 * Registers a GET route `/v1/verify` for signature verification.
 *
 * The route expects headers containing:
 * - `date`: The date associated with the message.
 * - `message`: The message to verify.
 * - `verification-keys`: The keys to use for verification.
 *
 * @param app {fastify.FastifyInstance} - The Fastify instance to register the route.
 *
 * @example
 * GET /v1/verify
 * Headers:
 *   - date: "2023-10-09T08:07:06Z"
 *   - message: "myMessage"
 *   - verification-keys: "myVerificationKeys"
 *
 * @returns {Object} The verification data.
 */
export default (app: fastify.FastifyInstance): void => {

  app
    .register(fastifyRateLimit, rateLimitOptions) // fastify-rate-limit plugin
    .get<{
      Headers: IHeadersVerify;
    }>("/v1/verify", async (request, reply) => {
      try {
        const verifyData = await verify({
          date: new Date(String(request.headers["date"])),
          message: String(request.headers["message"]),
          verificationKeys: String(request.headers["verification-keys"]),
        });
        reply.send({ data: verifyData });
      } catch (error) {
          reply.status(500).send({ error: 'Verification failed' });
      }
    });
};
