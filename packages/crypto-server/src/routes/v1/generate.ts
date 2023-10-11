/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Defines a route for key pair generation in the Fastify application.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import * as fastify from 'fastify';
import generate from '@sebastienrousseau/crypto-lib/dist/lib/generate';
import { IHeadersGenerate } from '../../@types/types';

/**
 * Registers a GET route `/v1/generate` for key pair generation.
 *
 * The route expects headers containing:
 * - `name`: Name of the entity.
 * - `email`: Email of the entity.
 * - `type`: Type of the key.
 * - `passphrase`: Passphrase for the key.
 * - `rsaBits`: [optional] Bit size of the RSA key. Defaults to 2048.
 * - `curve`: Curve type for key generation.
 * - `keyExpirationTime`: [optional] Key expiration time in seconds. Defaults to 0 (no expiration).
 * - `format`: Format of the key.
 *
 * @param app {fastify.FastifyInstance} - The Fastify instance to register the route.
 *
 * @example
 * GET /v1/generate
 * Headers:
 *   - name: "MyEntity"
 *   - email: "myentity@example.com"
 *   - type: "rsa"
 *   - passphrase: "myPassphrase"
 *   - rsaBits: "2048"
 *   - curve: "p256"
 *   - keyExpirationTime: "0"
 *   - format: "pem"
 *
 * @returns {Object} The generated key pair.
 */
export default (app: fastify.FastifyInstance): void => {
  app.get<{
    Headers: IHeadersGenerate;
  }>("/v1/generate", async (request, reply) => {
    try {
      const generateKeyPair = await generate({
        date: new Date(),
        name: String(request.headers["name"]),
        email: String(request.headers["email"]),
        userIDs: [{
          name: String(request.headers["name"]),
          email: String(request.headers["email"])
        }],
        type: String(request.headers["type"]),
        passphrase: String(request.headers["passphrase"]),
        rsaBits: Number(request.headers["rsaBits"] ?? 2048),
        curve: String(request.headers["curve"]),
        keyExpirationTime: Number(request.headers["keyExpirationTime"] ?? 0),
        format: String(request.headers["format"]),
      });
      reply.send({ data: generateKeyPair });
    } catch (error) {
        reply.status(500).send({ error: 'Key pair generation failed' });
    }
  });
};
