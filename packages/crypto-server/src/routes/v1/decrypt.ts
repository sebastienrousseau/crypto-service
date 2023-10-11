/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Defines a route for data decryption in the Fastify application.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import * as fastify from 'fastify';
import decrypt from '@sebastienrousseau/crypto-lib/dist/lib/decrypt';
import { IHeadersDecrypt } from '../../@types/types';

/**
 * Registers a GET route `/v1/decrypt` for data decryption.
 *
 * The route expects headers containing:
 * - `passphrase`: The passphrase for decryption.
 * - `message`: The encrypted message to decrypt.
 * - `public-key`: The public key to be used for decryption.
 *
 * @param app {fastify.FastifyInstance} - The Fastify instance to register the route.
 *
 * @example
 * GET /v1/decrypt
 * Headers:
 *   - passphrase: "myPassphrase"
 *   - message: "encryptedMessage"
 *   - public-key: "myPublicKey"
 *
 * @returns {Object} The decrypted data.
 */
export default (app: fastify.FastifyInstance): void => {
  app.get<{
    Headers: IHeadersDecrypt;
  }>("/v1/decrypt", async (request, reply) => {
    try {
      const encryptedData = await decrypt({
        passphrase: String(request.headers["passphrase"]),
        message: String(request.headers["message"]),
        publicKey: String(request.headers["public-key"]),
      });
      reply.send({ data: encryptedData });
    } catch (error) {
        reply.status(500).send({ error: 'Decryption failed' });
    }
  });
};
