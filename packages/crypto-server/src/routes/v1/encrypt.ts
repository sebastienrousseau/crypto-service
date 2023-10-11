/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Defines a route for data encryption in the Fastify application.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import * as fastify from 'fastify';
import encrypt from '@sebastienrousseau/crypto-lib/dist/lib/encrypt';
import { IHeadersEncrypt } from '../../@types/types';

/**
 * Registers a GET route `/v1/encrypt` for data encryption.
 *
 * The route expects headers containing:
 * - `passphrase`: The passphrase for encryption.
 * - `message`: The message to encrypt.
 * - `public-key`: The public key to be used for encryption.
 *
 * @param app {fastify.FastifyInstance} - The Fastify instance to register the route.
 *
 * @example
 * GET /v1/encrypt
 * Headers:
 *   - passphrase: "myPassphrase"
 *   - message: "myMessage"
 *   - public-key: "myPublicKey"
 *
 * @returns {Object} The encrypted data.
 */
export default (app: fastify.FastifyInstance): void => {
  app.get<{
    Headers: IHeadersEncrypt;
  }>("/v1/encrypt", async (request, reply) => {
    try {
      const encryptedData = await encrypt({
        passphrase: String(request.headers["passphrase"]),
        message: String(request.headers["message"]),
        publicKey: String(request.headers["public-key"]),
      });
      reply.send({ data: encryptedData });
    } catch (error) {
        reply.status(500).send({ error: 'Encryption failed' });
    }
  });
};
