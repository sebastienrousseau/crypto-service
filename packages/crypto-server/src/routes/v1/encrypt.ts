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
import {
  validateRequiredString,
  validateBase64,
  sendValidationError,
  validateApiKey,
  ValidationError
} from '../../utils/validation';

/**
 * Registers a GET route `/v1/encrypt` for data encryption.
 *
 * The route expects headers containing:
 * - `passphrase`: The passphrase for encryption.
 * - `message`: The message to encrypt.
 * - `public-key`: The public key to be used for encryption (base64 encoded).
 * - `x-api-key`: Optional API key for authentication.
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
      // API Key authentication (optional - controlled by environment variable)
      const apiKeyConfig = process.env.CRYPTO_API_KEY;
      if (!validateApiKey(request.headers["x-api-key"], apiKeyConfig)) {
        return reply.status(401).send({ error: 'Unauthorized: Invalid or missing API key' });
      }

      // Input validation
      const errors: ValidationError[] = [];

      const passphraseResult = validateRequiredString(
        request.headers["passphrase"],
        "passphrase"
      );
      if (!passphraseResult.valid) {
        errors.push(passphraseResult.error);
      }

      const messageResult = validateRequiredString(
        request.headers["message"],
        "message"
      );
      if (!messageResult.valid) {
        errors.push(messageResult.error);
      }

      const publicKeyResult = validateBase64(
        request.headers["public-key"],
        "public-key"
      );
      if (!publicKeyResult.valid) {
        errors.push(publicKeyResult.error);
      }

      if (errors.length > 0) {
        return sendValidationError(reply, errors);
      }

      // Type assertion is safe here because we've validated all inputs above
      const encryptedData = await encrypt({
        passphrase: (passphraseResult as { valid: true; value: string }).value,
        message: (messageResult as { valid: true; value: string }).value,
        publicKey: (publicKeyResult as { valid: true; value: string }).value,
      });

      reply.send({ data: encryptedData });
    } catch (error) {
      // Log error internally but don't expose details to client
      request.log.error(error, 'Encryption operation failed');
      reply.status(500).send({ error: 'Encryption failed' });
    }
  });
};
