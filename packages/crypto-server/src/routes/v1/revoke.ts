/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Defines a route for key revocation in the Fastify application.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import * as fastify from 'fastify';
import revoke from '@sebastienrousseau/crypto-lib/dist/lib/revoke';
import { IHeadersRevoke } from '../../@types/types';

/**
 * Registers a GET route `/v1/revoke` for key revocation.
 *
 * The route expects headers containing:
 * - `passphrase`: The passphrase for key revocation.
 * - `flag`: Flag to indicate the revocation status.
 * - `reason`: Reason for the key revocation.
 *
 * @param app {fastify.FastifyInstance} - The Fastify instance to register the route.
 *
 * @example
 * GET /v1/revoke
 * Headers:
 *   - passphrase: "myPassphrase"
 *   - flag: "1"
 *   - reason: "Key compromise"
 *
 * @returns {Object} The revocation data.
 */
export default (app: fastify.FastifyInstance): void => {
  app.get<{
    Headers: IHeadersRevoke;
  }>("/v1/revoke", async (request, reply) => {
    try {
      const revocationData = await revoke({
        passphrase: String(request.headers["passphrase"]),
        flag: Number(request.headers["flag"]),
        reason: String(request.headers["reason"]),
      });
      reply.send({ data: revocationData });
    } catch (error) {
        reply.status(500).send({ error: 'Revocation failed' });
    }
  });
};
